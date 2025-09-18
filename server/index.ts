import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { log, setupVite, serveStatic } from "./vite";
import Stripe from "stripe";
import { storage } from "./storage";

// Validate required environment variables at startup
if (!process.env.STRIPE_SECRET_KEY && !process.env.TESTING_STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing required environment variable: STRIPE_WEBHOOK_SECRET');
}

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY || "");

// Track processed webhook events to prevent duplicates
const processedEvents = new Set<string>();

async function startServer() {
  const app = express();
  
  // CRITICAL: Mount Stripe webhook BEFORE any body parsing middleware
  app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
    console.log('🚀 WEBHOOK RECEIVED');
    console.log('📊 Body length:', req.body?.length || 'undefined');
    
    let event;
    
    try {
      const sig = req.headers['stripe-signature'] as string;
      console.log('🔐 Stripe signature present:', !!sig);
      
      // PROPERLY verify webhook signature with Stripe
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
        console.log(`🔔 Webhook verified and received: ${event.type} (ID: ${event.id})`);
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // IMPROVED: Check for duplicate events with TTL cleanup
      if (processedEvents.has(event.id)) {
        console.log(`⚡ Skipping duplicate event: ${event.id}`);
        return res.status(200).json({ received: true, processed: false, reason: 'duplicate' });
      }
      
      // IMPROVED: Basic TTL cleanup - remove old events every 100 events
      if (processedEvents.size > 100) {
        console.log('🧹 Cleaning up old processed events');
        processedEvents.clear();
      }

      console.log(`✅ Processing webhook: ${event.type}`);
      
      // Handle checkout completion
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('📋 Checkout session completed:', session.id);
        
        if (session.payment_status === 'paid') {
          const { userId, planId, packageId } = session.metadata || {};
          
          if (userId) {
            // Check if user exists
            const user = await storage.getUser(parseInt(userId));
            if (!user) {
              console.error(`❌ User not found: ${userId}`);
              processedEvents.add(event.id);
              return res.status(200).json({ received: true, processed: false, reason: 'user_not_found' });
            }

            // Handle subscription payments
            if (session.mode === 'subscription' && planId) {
              const planDetails = {
                1: { name: 'Starter Flow', classesIncluded: 4, price: 119.96 },
                2: { name: 'Momentum Plan', classesIncluded: 8, price: 219.99 },
                3: { name: 'Fluency Boost', classesIncluded: 12, price: 299.99 },
              };

              const plan = planDetails[parseInt(planId) as keyof typeof planDetails];
              
              if (plan) {
                try {
                  // Update user with class credits
                  await storage.updateUser(parseInt(userId), {
                    classCredits: (user.classCredits || 0) + plan.classesIncluded
                  });
                  
                  console.log(`✅ Added ${plan.classesIncluded} class credits to user ${userId} for plan ${plan.name}`);
                  
                  // Create subscription record with proper billing date from Stripe
                  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                  await storage.createSubscription({
                    userId: parseInt(userId),
                    planId: parseInt(planId),
                    stripeSubscriptionId: session.subscription as string,
                    status: 'active',
                    nextBillingDate: new Date((subscription as any).current_period_end * 1000),
                  });
                  
                  console.log(`✅ Created subscription for user ${userId}, plan ${plan.name}`);
                  processedEvents.add(event.id);
                  res.json({received: true, processed: true});
                  return;
                } catch (error) {
                  console.error('❌ Error processing subscription:', error);
                  // DON'T mark as processed for transient errors - let Stripe retry
                  return res.status(500).json({ error: 'Processing failed - will retry' });
                }
              }
            }
            
            // Handle one-time package payments
            if (session.mode === 'payment' && packageId) {
              const packageDetails = {
                1: { name: '5 Clases', classes: 5, price: 99.99 },
                2: { name: '10 Clases', classes: 10, price: 189.99 },
                3: { name: '20 Clases', classes: 20, price: 359.99 },
                4: { name: '30 Clases', classes: 30, price: 519.99 },
              };

              const packageInfo = packageDetails[parseInt(packageId) as keyof typeof packageDetails];
              
              if (packageInfo) {
                try {
                  // Update user with class credits
                  await storage.updateUser(parseInt(userId), {
                    classCredits: (user.classCredits || 0) + packageInfo.classes
                  });
                  
                  console.log(`✅ Added ${packageInfo.classes} class credits to user ${userId} for package ${packageInfo.name}`);
                  processedEvents.add(event.id);
                  res.json({received: true, processed: true});
                  return;
                } catch (error) {
                  console.error('❌ Error processing package purchase:', error);
                  // DON'T mark as processed for transient errors - let Stripe retry
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
        console.log('💳 Invoice payment succeeded:', invoice.id);
        
        if ((invoice as any).subscription && (invoice as any).billing_reason === 'subscription_cycle') {
          try {
            // Get subscription from Stripe to find the user
            const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
            
            // Find user by subscription ID  
            const userSubscription = await storage.getSubscriptionByStripeId(subscription.id);
            if (!userSubscription) {
              console.log(`⚠️ Subscription not found, may be handled elsewhere: ${subscription.id}`);
              processedEvents.add(event.id);
              return res.status(200).json({ received: true, processed: false, reason: 'subscription_not_found' });
            }

            const user = await storage.getUser(userSubscription.userId);
            if (!user) {
              console.log(`⚠️ User not found for subscription: ${userSubscription.userId}`);
              processedEvents.add(event.id);
              return res.status(200).json({ received: true, processed: false, reason: 'user_not_found' });
            }

            // Add monthly credits based on plan
            const planDetails = {
              1: { name: 'Starter Flow', classesIncluded: 4 },
              2: { name: 'Momentum Plan', classesIncluded: 8 },
              3: { name: 'Fluency Boost', classesIncluded: 12 },
            };

            const plan = planDetails[userSubscription.planId as keyof typeof planDetails];
            if (plan) {
              await storage.updateUser(user.id, {
                classCredits: (user.classCredits || 0) + plan.classesIncluded
              });

              // Update next billing date
              await storage.updateSubscription(userSubscription.id, {
                nextBillingDate: new Date((subscription as any).current_period_end * 1000),
              });

              console.log(`✅ Added ${plan.classesIncluded} renewal credits to user ${user.id} for plan ${plan.name}`);
              processedEvents.add(event.id);
              return res.status(200).json({ received: true, processed: true });
            }
          } catch (error) {
            console.error('❌ Error processing subscription renewal:', error);
            // DON'T mark as processed for transient errors - let Stripe retry
            return res.status(500).json({ error: 'Processing failed - will retry' });
          }
        }
      }
      
      // Mark event as processed and acknowledge receipt
      processedEvents.add(event.id);
      res.status(200).json({received: true});
    } catch (error: any) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
  
  // Test endpoint to verify webhook connectivity
  app.get("/api/stripe-webhook-test", (req, res) => {
    console.log('🧪 WEBHOOK TEST ENDPOINT ACCESSED');
    res.json({ 
      message: "Webhook endpoint is accessible!", 
      url: "https://passport2fluencyportal.replit.app/api/stripe-webhook",
      timestamp: new Date().toISOString()
    });
  });
  
  // NOW add the regular body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // INTERCEPTOR: Capture API routes BEFORE Vite
  const apiRouter = express.Router();
  app.use(apiRouter);

  // Crear servidor HTTP
  const server = createServer(app);

  // Setup Vite dev server or serve static files  
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Register API routes using the intercepted router
  await registerRoutes(apiRouter as any);

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 EspañolPro server running on http://0.0.0.0:${PORT}`);
    log(`📚 Spanish learning platform is ready!`);
  });
}

startServer().catch(console.error);
