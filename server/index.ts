import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { log, setupVite, serveStatic } from "./vite";
import Stripe from "stripe";
import { storage } from "./storage";

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY || "", { 
  apiVersion: "2025-06-30.basil" 
});

async function startServer() {
  const app = express();
  
  // CRITICAL: Mount Stripe webhook BEFORE any body parsing middleware
  app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
    console.log('🚀 WEBHOOK RECEIVED - RAW ENTRY');
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📊 Body type:', typeof req.body);
    console.log('📏 Body length:', req.body?.length || 'undefined');
    
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
              return res.status(404).json({ error: 'User not found' });
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
                  
                  // Create subscription record
                  await storage.createSubscription({
                    userId: parseInt(userId),
                    planId: parseInt(planId),
                    stripeSubscriptionId: session.subscription as string,
                    status: 'active',
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                  });
                  
                  console.log(`✅ Created subscription for user ${userId}, plan ${plan.name}`);
                  res.json({received: true, processed: true});
                  return;
                } catch (error) {
                  console.error('❌ Error processing subscription:', error);
                  return res.status(500).json({ error: 'Failed to process subscription' });
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
                  res.json({received: true, processed: true});
                  return;
                } catch (error) {
                  console.error('❌ Error processing package purchase:', error);
                  return res.status(500).json({ error: 'Failed to process package purchase' });
                }
              }
            }
          }
        }
      }
      
      res.json({received: true});
    } catch (error: any) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
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
