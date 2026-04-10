import express from "express";
import { createServer } from "http";
import session from "express-session";
import memorystore from "memorystore";
import { registerRoutes } from "./routes";
import { log, setupVite, serveStatic } from "./vite";
import Stripe from "stripe";
import { storage } from "./storage";
import crypto from "crypto";
import { config } from "./config";
import { PLAN_DETAILS, PACKAGE_DETAILS, AMOUNT_TO_PACKAGE } from "./constants/plans";
import { stripeCache } from "./services/stripe-cache";
import { wsService } from "./services/websocket";
import rateLimit from "express-rate-limit";

// Initialize Stripe - allow running without keys in development
const stripeKey = config.STRIPE_SECRET_KEY || config.TESTING_STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;


async function startServer() {
  const app = express();

  // Trust Railway's reverse proxy so secure cookies work over HTTPS
  app.set("trust proxy", 1);

  // Session configuration - use PG store when database is available
  const sessionSecret = config.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

  let sessionStore: session.Store;
  if (config.DATABASE_URL) {
    const pg = (await import("pg")).default;
    const pgPool = new pg.Pool({
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    const pgSession = (await import("connect-pg-simple")).default;
    const PgStore = pgSession(session);
    sessionStore = new PgStore({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    });
    log("Using PostgreSQL session store");
  } else {
    const MemoryStore = memorystore(session);
    sessionStore = new MemoryStore({ checkPeriod: 86400000 });
    log("Using in-memory session store");
  }

  const sessionMiddleware = session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  });

  app.use(sessionMiddleware);

  // Passport initialization (OAuth strategies — no passport.session(), we use express-session)
  const passport = await import("passport");
  app.use(passport.default.initialize());

  // Global API rate limiting (100 requests per minute per IP)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: config.NODE_ENV === "production" ? 100 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  });
  app.use("/api/", apiLimiter);

  // CRITICAL: Mount Stripe webhook BEFORE any body parsing middleware
  if (stripe) {
    app.post("/api/stripe-webhook", express.raw({ type: 'application/json' }), async (req, res) => {
      if (!config.STRIPE_WEBHOOK_SECRET) {
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      let event;

      try {
        const sig = req.headers['stripe-signature'] as string;

        try {
          event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET!);
        } catch (err: any) {
          console.error('Webhook signature verification failed:', err.message);
          return res.status(400).json({ error: `Webhook Error: ${err.message}` });
        }

        // Check for duplicate events (DB-backed dedup — survives restarts)
        const alreadySeen = await storage.getStripeEventByStripeId(event.id);
        if (alreadySeen) {
          return res.status(200).json({ received: true, processed: false, reason: 'duplicate' });
        }

        // Handle checkout completion
        if (event.type === 'checkout.session.completed') {
          const checkoutSession = event.data.object;

          if (checkoutSession.payment_status === 'paid') {
            const { userId, planId, packageId } = checkoutSession.metadata || {};

            // Handle direct Stripe link purchases (no metadata)
            if (!userId) {
              const customerEmail = checkoutSession.customer_details?.email || (checkoutSession as any).customer_email;

              if (!customerEmail) {
                await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                return res.status(200).json({ received: true, processed: false, reason: 'no_email' });
              }

              try {
                const user = await storage.getUserByEmail(customerEmail.toLowerCase());

                if (user) {
                  const amountInCents = checkoutSession.amount_total || 0;
                  const packageInfo = AMOUNT_TO_PACKAGE[amountInCents];

                  if (packageInfo) {
                    await storage.updateUser(user.id, {
                      classCredits: (user.classCredits || 0) + packageInfo.classes
                    });
                    console.log(`Added ${packageInfo.classes} credits to user ${user.id} via direct link`);
                    await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                    return res.json({ received: true, processed: true, type: 'direct_link' });
                  }
                }

                await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                return res.status(200).json({ received: true, processed: false, reason: 'unknown_amount_or_user' });
              } catch (error) {
                console.error('Error processing direct link purchase:', error);
                return res.status(500).json({ error: 'Processing direct link failed - will retry' });
              }
            }

            if (userId) {
              const user = await storage.getUser(parseInt(userId));
              if (!user) {
                await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                return res.status(200).json({ received: true, processed: false, reason: 'user_not_found' });
              }

              // Track promotion code usage if a discount was applied
              try {
                const discounts = (checkoutSession as any).total_details?.breakdown?.discounts;
                if (discounts && discounts.length > 0) {
                  for (const d of discounts) {
                    const promoCodeId = d.discount?.promotion_code;
                    if (promoCodeId) {
                      const offer = await storage.getOfferByStripePromotionCodeId(promoCodeId);
                      if (offer) await storage.incrementOfferUsage(offer.id);
                    }
                  }
                }
              } catch (e) {
                console.warn('Could not track promo code usage:', e);
              }

              if (checkoutSession.mode === 'subscription' && planId) {
                const planDetails = PLAN_DETAILS;

                const plan = planDetails[parseInt(planId)];

                if (plan) {
                  try {
                    await storage.updateUser(parseInt(userId), {
                      classCredits: (user.classCredits || 0) + plan.classesIncluded
                    });

                    const sub = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
                    await storage.createSubscription({
                      userId: parseInt(userId),
                      planId: parseInt(planId),
                      stripeSubscriptionId: checkoutSession.subscription as string,
                      status: 'active',
                      nextBillingDate: new Date((sub as any).current_period_end * 1000),
                    });

                    // Auto-subscribe to newsletter
                    try {
                      await storage.upsertNewsletterSubscriber({
                        email: user.email,
                        firstName: user.firstName || undefined,
                        lastName: user.lastName || undefined,
                        source: 'checkout',
                        status: 'active',
                        userId: user.id,
                      });
                    } catch (e) { /* ignore */ }

                    // Promote to customer
                    if (user.userType !== 'customer' && user.userType !== 'admin' && user.userType !== 'tutor') {
                      await storage.updateUser(parseInt(userId), { userType: 'customer' });
                    }
                    console.log(`Subscription created for user ${userId}, plan ${plan.name}`);
                    await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: parseInt(userId), amount: checkoutSession.amount_total, currency: checkoutSession.currency || 'usd', metadata: { planId } });
                    return res.json({ received: true, processed: true });
                  } catch (error) {
                    console.error('Error processing subscription:', error);
                    return res.status(500).json({ error: 'Processing failed - will retry' });
                  }
                }
              }

              if (checkoutSession.mode === 'payment' && packageId) {
                const packageDetails = PACKAGE_DETAILS;

                const packageInfo = packageDetails[parseInt(packageId)];

                if (packageInfo) {
                  try {
                    await storage.updateUser(parseInt(userId), {
                      classCredits: (user.classCredits || 0) + packageInfo.classes
                    });

                    // Promote to customer
                    if (user.userType !== 'customer' && user.userType !== 'admin' && user.userType !== 'tutor') {
                      await storage.updateUser(parseInt(userId), { userType: 'customer' });
                    }
                    console.log(`Added ${packageInfo.classes} credits to user ${userId}`);
                    await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: parseInt(userId), amount: checkoutSession.amount_total, currency: checkoutSession.currency || 'usd', metadata: { packageId } });
                    return res.json({ received: true, processed: true });
                  } catch (error) {
                    console.error('Error processing package purchase:', error);
                    return res.status(500).json({ error: 'Processing failed - will retry' });
                  }
                }
              }
            }
          }
        }

        // Handle subscription renewals
        if (event.type === 'invoice.payment_succeeded') {
          const invoice = event.data.object;

          if ((invoice as any).subscription && (invoice as any).billing_reason === 'subscription_cycle') {
            try {
              const sub = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
              const userSubscription = await storage.getSubscriptionByStripeId(sub.id);

              if (!userSubscription) {
                await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                return res.status(200).json({ received: true, processed: false, reason: 'subscription_not_found' });
              }

              const user = await storage.getUser(userSubscription.userId);
              if (!user) {
                await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                return res.status(200).json({ received: true, processed: false, reason: 'user_not_found' });
              }

              const planDetails: Record<number, { name: string; classesIncluded: number }> = {
                1: { name: 'Starter Flow', classesIncluded: 4 },
                2: { name: 'Momentum Plan', classesIncluded: 8 },
                3: { name: 'Fluency Boost', classesIncluded: 12 },
              };

              const plan = planDetails[userSubscription.planId];
              if (plan) {
                await storage.updateUser(user.id, {
                  classCredits: (user.classCredits || 0) + plan.classesIncluded
                });

                await storage.updateSubscription(userSubscription.id, {
                  nextBillingDate: new Date((sub as any).current_period_end * 1000),
                });

                console.log(`Added ${plan.classesIncluded} renewal credits to user ${user.id}`);
                await storage.createStripeEvent({ eventType: event.type, stripeEventId: event.id, stripeCustomerId: (event.data.object as any).customer || null, userId: null, amount: null, currency: 'usd', metadata: null });
                return res.status(200).json({ received: true, processed: true });
              }
            } catch (error) {
              console.error('Error processing subscription renewal:', error);
              return res.status(500).json({ error: 'Processing failed - will retry' });
            }
          }
        }

        // Handle subscription cancellation
        if (event.type === 'customer.subscription.deleted') {
          const sub = event.data.object;
          try {
            const userSubscription = await storage.getSubscriptionByStripeId(sub.id);
            if (userSubscription) {
              await storage.updateSubscription(userSubscription.id, {
                status: 'cancelled',
                cancelledAt: new Date(),
              });
              await storage.createStripeEvent({
                eventType: 'subscription_cancelled',
                stripeEventId: event.id,
                stripeCustomerId: (sub as any).customer || null,
                userId: userSubscription.userId,
                amount: (sub as any).plan?.amount || 0,
                currency: (sub as any).plan?.currency || 'usd',
                metadata: { subscriptionId: sub.id },
              });
              stripeCache.invalidatePrefix('mrr');
              stripeCache.invalidatePrefix('stripe-metrics');
              console.log(`Subscription cancelled for user ${userSubscription.userId}`);
            }
          } catch (error) {
            console.error('Error processing subscription cancellation:', error);
            return res.status(500).json({ error: 'Processing failed - will retry' });
          }
        }

        // Handle charge refund
        if (event.type === 'charge.refunded') {
          const charge = event.data.object;
          try {
            const paymentIntentId = (charge as any).payment_intent;
            if (paymentIntentId) {
              const purchase = await storage.getClassPurchaseByPaymentIntent(paymentIntentId);
              if (purchase) {
                await storage.updateClassPurchase(purchase.id, {
                  status: 'refunded',
                  refundedAt: new Date(),
                  refundId: (charge as any).refunds?.data?.[0]?.id || null,
                });
                const user = await storage.getUser(purchase.userId);
                if (user) {
                  const newCredits = Math.max(0, (user.classCredits || 0) - purchase.classesAdded);
                  await storage.updateUser(user.id, { classCredits: newCredits });
                }
              }
            }
            await storage.createStripeEvent({
              eventType: 'charge_refunded',
              stripeEventId: event.id,
              stripeCustomerId: (charge as any).customer || null,
              userId: null,
              amount: (charge as any).amount_refunded || (charge as any).amount || 0,
              currency: (charge as any).currency || 'usd',
              metadata: { chargeId: charge.id, paymentIntentId: (charge as any).payment_intent },
            });
            stripeCache.invalidatePrefix('transactions');
            stripeCache.invalidatePrefix('student-stripe');
            console.log(`Charge refunded: ${charge.id}`);
          } catch (error) {
            console.error('Error processing charge refund:', error);
            return res.status(500).json({ error: 'Processing failed - will retry' });
          }
        }

        // Handle failed payment
        if (event.type === 'invoice.payment_failed') {
          const invoice = event.data.object;
          try {
            const subId = (invoice as any).subscription;
            let eventUserId: number | null = null;
            if (subId) {
              const userSubscription = await storage.getSubscriptionByStripeId(subId);
              if (userSubscription) {
                eventUserId = userSubscription.userId;
              }
            }
            await storage.createStripeEvent({
              eventType: 'payment_failed',
              stripeEventId: event.id,
              stripeCustomerId: (invoice as any).customer || null,
              userId: eventUserId,
              amount: (invoice as any).amount_due || 0,
              currency: (invoice as any).currency || 'usd',
              metadata: { invoiceId: invoice.id, subscriptionId: subId },
            });
            stripeCache.invalidatePrefix('stripe-metrics');
            console.log(`Payment failed for invoice ${invoice.id}`);
          } catch (error) {
            console.error('Error processing failed payment:', error);
            return res.status(500).json({ error: 'Processing failed - will retry' });
          }
        }

        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });
  }

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      storage: config.DATABASE_URL ? "database" : "memory",
      timestamp: new Date().toISOString()
    });
  });

  // NOW add the regular body parsing middleware (after webhook)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Register API routes BEFORE Vite so they don't get intercepted
  await registerRoutes(app);

  const server = createServer(app);

  // Initialize WebSocket with session-based auth
  wsService.initialize(server, sessionMiddleware);

  // Setup Vite dev server or serve static files
  if (config.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start autoconfirmation periodic check
  try {
    const { autoconfirmService } = await import("./services/autoconfirm");
    autoconfirmService.startPeriodicCheck();
    log("Autoconfirmation service started");

    const { dripCampaignService } = await import("./services/drip-campaign");
    dripCampaignService.startPeriodicCheck();
    log("Drip campaign service started");

    const { ClassSchedulerService } = await import("./services/class-scheduler");
    const classScheduler = new ClassSchedulerService();
    classScheduler.startReminderService();
    log("Class reminder service started (24h before class reminders)");
  } catch (error) {
    console.error("Failed to start background services:", error);
  }

  // DB health check + idempotent schema migrations
  if (config.DATABASE_URL) {
    try {
      const { pool: pgPool } = await import("./db");
      if (pgPool) {
        await pgPool.query("SELECT 1");
        log("Database connection verified");
        await pgPool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;
          ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tutor_response TEXT;
          ALTER TABLE reviews ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;
          ALTER TABLE classes ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
          ALTER TABLE classes ADD COLUMN IF NOT EXISTS tutor_calendar_event_id TEXT;
          ALTER TABLE classes ADD COLUMN IF NOT EXISTS session_notes TEXT;
          ALTER TABLE classes ADD COLUMN IF NOT EXISTS shared_notes TEXT;
          ALTER TABLE classes ADD COLUMN IF NOT EXISTS homework_text TEXT;
          ALTER TABLE classes ADD COLUMN IF NOT EXISTS topics_covered TEXT[];
          ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_tutor_id INTEGER;
          UPDATE users SET email_verified = TRUE
            WHERE email_verified IS FALSE
              AND (google_id IS NOT NULL OR microsoft_id IS NOT NULL OR user_type = 'admin');
          CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
          CREATE TABLE IF NOT EXISTS tutor_payments (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            classes_count INTEGER NOT NULL DEFAULT 0,
            hours_worked DECIMAL(10,2) NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payment_method TEXT,
            payment_reference TEXT,
            receipt_url TEXT,
            notes TEXT,
            paid_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by INTEGER
          );
          CREATE TABLE IF NOT EXISTS tutor_materials (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            file_url TEXT,
            external_url TEXT,
            file_type TEXT NOT NULL DEFAULT 'link',
            level TEXT,
            category TEXT DEFAULT 'general',
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS tutor_availability (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS tutor_availability_exceptions (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL,
            date TIMESTAMP NOT NULL,
            is_blocked BOOLEAN DEFAULT TRUE,
            start_time TEXT,
            end_time TEXT,
            reason TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        // Fix any availability rows with NULL isAvailable
        await pgPool.query(`UPDATE tutor_availability SET is_available = TRUE WHERE is_available IS NULL`);
        log("Schema migrations applied");

        // Migrate tutors table
        try {
          // 1. Add missing columns
          await pgPool.query(`
            ALTER TABLE tutors ADD COLUMN IF NOT EXISTS invite_token TEXT;
            ALTER TABLE tutors ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMP;
            ALTER TABLE tutors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            ALTER TABLE tutors ADD COLUMN IF NOT EXISTS ics_token TEXT;
          `);

          // 2. Convert class_type text → text[] ONLY if it's not already an array
          const classTypeCheck = await pgPool.query(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'tutors' AND column_name = 'class_type'
          `);
          if (classTypeCheck.rows.length > 0 && classTypeCheck.rows[0].data_type !== 'ARRAY') {
            log("Migrating class_type from text to text[]...");
            await pgPool.query(`ALTER TABLE tutors ALTER COLUMN class_type TYPE text[] USING ARRAY[class_type]`);
          }

          // 3. Convert language_taught text → text[] ONLY if it's not already an array
          const langCheck = await pgPool.query(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'tutors' AND column_name = 'language_taught'
          `);
          if (langCheck.rows.length > 0 && langCheck.rows[0].data_type !== 'ARRAY') {
            log("Migrating language_taught from text to text[]...");
            await pgPool.query(`ALTER TABLE tutors ALTER COLUMN language_taught TYPE text[] USING ARRAY[language_taught]`);
          }

          // 4. Fix NULL isActive — this is critical, tutors with NULL isActive are invisible
          await pgPool.query(`UPDATE tutors SET is_active = TRUE WHERE is_active IS NULL`);

          log("Tutor migrations applied");
        } catch (migErr) {
          console.error("STARTUP: Tutor migration error:", migErr);
        }

        // Link tutor profiles to user accounts + deduplicate
        try {
          // 1. Link unlinked tutor profiles to matching user accounts by email
          const linked = await pgPool.query(`
            UPDATE tutors t
            SET user_id = u.id
            FROM users u
            WHERE LOWER(t.email) = LOWER(u.email)
              AND t.user_id IS NULL
              AND u.user_type = 'tutor'
          `);
          if (linked.rowCount && linked.rowCount > 0) {
            log(`Linked ${linked.rowCount} tutor profiles to user accounts by email`);
          }

          // 2. Find duplicate tutor profiles (same user_id linked to multiple tutor rows)
          // Move availability from duplicates to the LOWEST id (the original profile students see)
          const dupes = await pgPool.query(`
            SELECT user_id, MIN(id) as keep_id, ARRAY_AGG(id ORDER BY id) as all_ids
            FROM tutors
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            HAVING COUNT(*) > 1
          `);
          for (const row of dupes.rows) {
            const keepId = row.keep_id;
            const allIds = row.all_ids;
            const dupeIds = allIds.filter((id: number) => id !== keepId);
            if (dupeIds.length > 0) {
              // Move availability from duplicate to the kept profile
              await pgPool.query(
                `UPDATE tutor_availability SET tutor_id = $1 WHERE tutor_id = ANY($2::int[])`,
                [keepId, dupeIds]
              );
              // Move exceptions too
              await pgPool.query(
                `UPDATE tutor_availability_exceptions SET tutor_id = $1 WHERE tutor_id = ANY($2::int[])`,
                [keepId, dupeIds]
              );
              // Deactivate duplicate profiles (don't delete — might have classes linked)
              await pgPool.query(
                `UPDATE tutors SET is_active = FALSE, email = email || '_dup_' || id WHERE id = ANY($1::int[])`,
                [dupeIds]
              );
              log(`Merged ${dupeIds.length} duplicate tutor profiles into tutor ${keepId} for user ${row.user_id}`);
            }
          }

          // 3. Also handle case where availability exists for a tutor ID that has no user_id
          // but another tutor with same email HAS a user_id (the auto-linked one)
          const orphaned = await pgPool.query(`
            SELECT ta.tutor_id as orphan_id, t2.id as target_id
            FROM tutor_availability ta
            JOIN tutors t1 ON ta.tutor_id = t1.id
            JOIN tutors t2 ON LOWER(t1.email) = LOWER(t2.email) AND t2.id != t1.id
            WHERE t1.user_id IS NOT NULL AND t2.user_id IS NOT NULL AND t1.id > t2.id
          `);
          for (const row of orphaned.rows) {
            await pgPool.query(
              `UPDATE tutor_availability SET tutor_id = $1 WHERE tutor_id = $2`,
              [row.target_id, row.orphan_id]
            );
            log(`Moved orphaned availability from tutor ${row.orphan_id} to ${row.target_id}`);
          }

          log("Tutor profile deduplication complete");
        } catch (dedupeErr) {
          console.error("STARTUP: Tutor deduplication error:", dedupeErr);
        }

        // Check tutor count via raw SQL (bypasses Drizzle ORM parsing)
        try {
          const countResult = await pgPool.query("SELECT COUNT(*) as cnt FROM tutors");
          const tutorCount = parseInt(countResult.rows[0]?.cnt || "0");
          log(`Found ${tutorCount} tutors in database`);

          if (tutorCount === 0) {
            log("No tutors found — running seed...");
            const { seedTutors } = await import("./seed-tutors");
            await seedTutors();
            log("Seeded initial tutors");
          }
        } catch (seedErr) {
          console.error("STARTUP: Tutor seed failed:", seedErr);
        }
      }
    } catch (err) {
      console.error("STARTUP: Database connectivity or migration failed:", err);
    }
  }

  server.listen(config.PORT, "0.0.0.0", () => {
    log(`Server running on http://0.0.0.0:${config.PORT}`);
  });
}

startServer().catch(console.error);
