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

// Initialize Stripe - allow running without keys in development
const stripeKey = config.STRIPE_SECRET_KEY || config.TESTING_STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Track processed webhook events to prevent duplicates
const processedEvents = new Set<string>();

async function startServer() {
  const app = express();

  // Session configuration - use PG store when database is available
  const sessionSecret = config.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

  let sessionStore: session.Store;
  if (config.DATABASE_URL) {
    const pgSession = (await import("connect-pg-simple")).default;
    const PgStore = pgSession(session);
    sessionStore = new PgStore({
      conString: config.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: true,
    });
    log("Using PostgreSQL session store");
  } else {
    const MemoryStore = memorystore(session);
    sessionStore = new MemoryStore({ checkPeriod: 86400000 });
    log("Using in-memory session store");
  }

  app.use(session({
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
  }));

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

        // Check for duplicate events
        if (processedEvents.has(event.id)) {
          return res.status(200).json({ received: true, processed: false, reason: 'duplicate' });
        }

        // TTL cleanup - keep last 500 events instead of clearing all
        if (processedEvents.size > 500) {
          const entries = Array.from(processedEvents);
          entries.slice(0, entries.length - 250).forEach(id => processedEvents.delete(id));
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
                processedEvents.add(event.id);
                return res.status(200).json({ received: true, processed: false, reason: 'no_email' });
              }

              try {
                const allUsers = await storage.getAllUsers();
                const user = allUsers.find(u => u.email?.toLowerCase() === customerEmail?.toLowerCase());

                if (user) {
                  const amountInCents = checkoutSession.amount_total || 0;
                  const packageByAmount: Record<number, { name: string; classes: number }> = {
                    14995: { name: '5-Class Package', classes: 5 },
                    27490: { name: '10-Class Package', classes: 10 },
                    49980: { name: '20-Class Package', classes: 20 }
                  };

                  const packageInfo = packageByAmount[amountInCents];

                  if (packageInfo) {
                    await storage.updateUser(user.id, {
                      classCredits: (user.classCredits || 0) + packageInfo.classes
                    });
                    console.log(`Added ${packageInfo.classes} credits to user ${user.id} via direct link`);
                    processedEvents.add(event.id);
                    return res.json({ received: true, processed: true, type: 'direct_link' });
                  }
                }

                processedEvents.add(event.id);
                return res.status(200).json({ received: true, processed: false, reason: 'unknown_amount_or_user' });
              } catch (error) {
                console.error('Error processing direct link purchase:', error);
                return res.status(500).json({ error: 'Processing direct link failed - will retry' });
              }
            }

            if (userId) {
              const user = await storage.getUser(parseInt(userId));
              if (!user) {
                processedEvents.add(event.id);
                return res.status(200).json({ received: true, processed: false, reason: 'user_not_found' });
              }

              if (checkoutSession.mode === 'subscription' && planId) {
                const planDetails: Record<number, { name: string; classesIncluded: number }> = {
                  1: { name: 'Starter Flow', classesIncluded: 4 },
                  2: { name: 'Momentum Plan', classesIncluded: 8 },
                  3: { name: 'Fluency Boost', classesIncluded: 12 },
                };

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

                    console.log(`Subscription created for user ${userId}, plan ${plan.name}`);
                    processedEvents.add(event.id);
                    return res.json({ received: true, processed: true });
                  } catch (error) {
                    console.error('Error processing subscription:', error);
                    return res.status(500).json({ error: 'Processing failed - will retry' });
                  }
                }
              }

              if (checkoutSession.mode === 'payment' && packageId) {
                const packageDetails: Record<number, { name: string; classes: number }> = {
                  1: { name: '5 Clases', classes: 5 },
                  2: { name: '10 Clases', classes: 10 },
                  3: { name: '20 Clases', classes: 20 },
                  4: { name: '30 Clases', classes: 30 },
                };

                const packageInfo = packageDetails[parseInt(packageId)];

                if (packageInfo) {
                  try {
                    await storage.updateUser(parseInt(userId), {
                      classCredits: (user.classCredits || 0) + packageInfo.classes
                    });

                    console.log(`Added ${packageInfo.classes} credits to user ${userId}`);
                    processedEvents.add(event.id);
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
                processedEvents.add(event.id);
                return res.status(200).json({ received: true, processed: false, reason: 'subscription_not_found' });
              }

              const user = await storage.getUser(userSubscription.userId);
              if (!user) {
                processedEvents.add(event.id);
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
                processedEvents.add(event.id);
                return res.status(200).json({ received: true, processed: true });
              }
            } catch (error) {
              console.error('Error processing subscription renewal:', error);
              return res.status(500).json({ error: 'Processing failed - will retry' });
            }
          }
        }

        processedEvents.add(event.id);
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register API routes BEFORE Vite so they don't get intercepted
  await registerRoutes(app);

  const server = createServer(app);

  // Setup Vite dev server or serve static files
  if (config.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(config.PORT, "0.0.0.0", () => {
    log(`Server running on http://0.0.0.0:${config.PORT}`);
  });
}

startServer().catch(console.error);
