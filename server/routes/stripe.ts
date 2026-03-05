import type { Express, Response } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { SUBSCRIPTION_PLANS, CLASS_PACKAGES } from "@shared/plans";
import { requireAuth } from "./auth";

// Initialize Stripe only if keys are available
const stripeKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const stripe: Stripe | null = stripeKey ? new Stripe(stripeKey) : null;

export function requireStripe(res: Response): Stripe | null {
  if (!stripe) {
    res.status(503).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env" });
    return null;
  }
  return stripe;
}

export function registerStripeRoutes(app: Express) {
  // Stripe debug info (development only)
  app.get("/api/stripe-debug", (_req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ message: "Not found" });
    }

    const testingKey = process.env.TESTING_STRIPE_SECRET_KEY;
    const prodKey = process.env.STRIPE_SECRET_KEY;
    const currentKey = testingKey || "sk_test_fake_key";
    const isTestMode = currentKey.startsWith("sk_test_");

    res.json({
      isTestMode,
      keyType: isTestMode ? "TEST" : "LIVE",
      keyPrefix: currentKey.substring(0, 12) + "...",
      testingKeyExists: !!testingKey,
      prodKeyExists: !!prodKey,
      message: isTestMode
        ? "MODO TEST - Debe funcionar con 4242..."
        : "MODO LIVE - Requiere tarjetas reales",
    });
  });

  // Create payment intent (for direct payments)
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, metadata = {} } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe!.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        description: metadata.packageName || "Class package payment",
        metadata: {
          platform: "passport2fluency",
          ...metadata,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Create subscription
  app.post("/api/create-subscription", async (req, res) => {
    try {
      const { planId, userId } = req.body;

      if (!planId || !userId) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      const isTestMode = (
        process.env.TESTING_STRIPE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY ||
        ""
      ).startsWith("sk_test_");

      const currentPlan = SUBSCRIPTION_PLANS[planId as number];
      if (!currentPlan) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      let priceId: string;

      if (isTestMode) {
        console.log(`Checkout TEST - Creando precio dinamico para ${currentPlan.name}`);

        const price = await stripe!.prices.create({
          unit_amount: currentPlan.price,
          currency: "usd",
          recurring: { interval: "month" },
          product_data: {
            name: `${currentPlan.name} - ${currentPlan.description}`,
          },
          metadata: {
            planId: planId.toString(),
            platform: "passport2fluency",
            testMode: "true",
          },
        });
        priceId = price.id;
      } else {
        const stripePriceIds: Record<number, string | undefined> = {
          1: process.env.STRIPE_PRICE_ID_PLAN_1,
          2: process.env.STRIPE_PRICE_ID_PLAN_2,
          3: process.env.STRIPE_PRICE_ID_PLAN_3,
        };

        const selectedPriceId = stripePriceIds[planId as number];

        if (!selectedPriceId) {
          return res
            .status(400)
            .json({ message: "Invalid plan ID or Stripe Price ID not configured" });
        }
        priceId = selectedPriceId;
      }

      // Get or create Stripe customer
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe!.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: userId.toString(),
            platform: "passport2fluency",
          },
        });
        customerId = customer.id;

        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create subscription with proper metadata
      const subscription = await stripe!.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          platform: "passport2fluency",
        },
      });

      const invoice = subscription.latest_invoice;
      const paymentIntent =
        typeof invoice === "string" ? null : (invoice as any)?.payment_intent;

      res.json({
        clientSecret: paymentIntent?.client_secret,
        subscriptionId: subscription.id,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Create Stripe checkout session for subscription
  app.post("/api/create-checkout-session", requireAuth, async (req, res) => {
    try {
      const { planId, userId } = req.body;

      if (!planId || !userId) {
        return res.status(400).json({ message: "Missing required data" });
      }

      const isTestMode = (
        process.env.TESTING_STRIPE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY ||
        ""
      ).startsWith("sk_test_");

      const currentPlan = SUBSCRIPTION_PLANS[planId as number];
      if (!currentPlan) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      let priceId: string;

      if (isTestMode) {
        console.log(`Checkout TEST - Creando precio dinamico para ${currentPlan.name}`);

        const price = await stripe!.prices.create({
          unit_amount: currentPlan.price,
          currency: "usd",
          recurring: { interval: "month" },
          product_data: {
            name: `${currentPlan.name} - ${currentPlan.description}`,
          },
          metadata: {
            planId: planId.toString(),
            platform: "passport2fluency",
            testMode: "true",
          },
        });
        priceId = price.id;
      } else {
        const stripePriceIds: Record<number, string | undefined> = {
          1: process.env.STRIPE_PRICE_ID_PLAN_1,
          2: process.env.STRIPE_PRICE_ID_PLAN_2,
          3: process.env.STRIPE_PRICE_ID_PLAN_3,
        };

        const selectedPriceId = stripePriceIds[planId as number];

        if (!selectedPriceId) {
          return res
            .status(400)
            .json({ message: "Invalid plan ID or Stripe Price ID not configured" });
        }
        priceId = selectedPriceId;
      }

      // Get user for customer information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create checkout session with proper subscription metadata
      const session = await stripe!.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: userId.toString(),
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          platform: "passport2fluency",
        },
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            planId: planId.toString(),
            platform: "passport2fluency",
          },
        },
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/packages`,
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Create Stripe checkout session for class packages (one-time payment)
  app.post("/api/create-package-checkout-session", requireAuth, async (req, res) => {
    try {
      const { packageId, userId } = req.body;

      if (!packageId || !userId) {
        return res.status(400).json({ message: "Missing required data" });
      }

      const s = requireStripe(res);
      if (!s) return;

      const pkg = CLASS_PACKAGES[packageId as number];
      if (!pkg) {
        return res.status(400).json({ message: "Invalid package ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const session = await s.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: pkg.price,
              product_data: { name: `${pkg.name} - Class Package` },
            },
            quantity: 1,
          },
        ],
        customer_email: user.email,
        client_reference_id: userId.toString(),
        metadata: {
          userId: userId.toString(),
          packageId: packageId.toString(),
          type: "package",
          platform: "passport2fluency",
        },
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/packages`,
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error("Error creating package checkout session:", error);
      res
        .status(500)
        .json({ message: "Error creating package checkout session: " + error.message });
    }
  });

  // Create Customer Portal Session for subscription management
  app.post("/api/create-customer-portal-session", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;

      // If user doesn't have a Stripe customer ID, create one
      if (!customerId) {
        const customer = await stripe!.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: userId.toString(),
            platform: "passport2fluency",
          },
        });
        customerId = customer.id;

        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      const baseUrl = req.headers.origin || `${req.protocol}://${req.get("host")}`;
      const returnUrl = `${baseUrl}/dashboard`;

      console.log("Creating Customer Portal with customerId:", customerId);
      console.log("Creating Customer Portal with return_url:", returnUrl);

      const configuration = await stripe!.billingPortal.configurations.create({
        business_profile: {
          headline: "Passport2Fluency",
          privacy_policy_url: "https://portal.passport2fluency.com/privacy",
          terms_of_service_url: "https://portal.passport2fluency.com/terms",
        },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true },
        },
      });

      console.log("Created Customer Portal configuration:", configuration.id);

      const portalSession = await stripe!.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        configuration: configuration.id,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Error creating customer portal session:", error);
      res
        .status(500)
        .json({ message: "Error creating customer portal session: " + error.message });
    }
  });

  // Create Customer Portal session for upgrades
  app.post("/api/create-upgrade-portal-session", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe!.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: userId.toString(),
            platform: "passport2fluency",
          },
        });
        customerId = customer.id;

        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      const baseUrl = req.headers.origin || `${req.protocol}://${req.get("host")}`;
      const returnUrl = `${baseUrl}/dashboard`;

      console.log("Creating Upgrade Portal with customerId:", customerId);
      console.log("Creating Upgrade Portal with return_url:", returnUrl);

      const upgradeConfiguration = await stripe!.billingPortal.configurations.create({
        business_profile: {
          headline: "Passport2Fluency - Upgrade Your Plan",
          privacy_policy_url: "https://portal.passport2fluency.com/privacy",
          terms_of_service_url: "https://portal.passport2fluency.com/terms",
        },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: false },
        },
      });

      console.log("Created Upgrade Portal configuration:", upgradeConfiguration.id);

      const portalSession = await stripe!.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        configuration: upgradeConfiguration.id,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Error creating upgrade portal session:", error);
      res
        .status(500)
        .json({ message: "Error creating upgrade portal session: " + error.message });
    }
  });

  // Get subscription for a user
  app.get("/api/subscription/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscription = await storage.getUserSubscription(userId);

      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Extract Price ID from Stripe Payment Links (development only)
  app.post("/api/extract-price-id", async (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const { paymentLinkUrl } = req.body;

      if (!paymentLinkUrl) {
        return res.status(400).json({ message: "Payment Link URL is required" });
      }

      const linkId = paymentLinkUrl.split("/").pop()?.split("?")[0];

      if (!linkId) {
        return res.status(400).json({ message: "Invalid Payment Link URL format" });
      }

      const paymentLink = await stripe!.paymentLinks.retrieve(linkId, {
        expand: ["line_items"],
      });

      if (!paymentLink.line_items?.data?.length) {
        return res.status(400).json({ message: "No line items found in payment link" });
      }

      const lineItem = paymentLink.line_items.data[0];

      if (!lineItem.price) {
        return res.status(400).json({ message: "No price information found" });
      }

      const priceInfo = {
        priceId: lineItem.price.id,
        amount: lineItem.price.unit_amount || 0,
        currency: lineItem.price.currency,
        productId: lineItem.price.product,
        nickname: lineItem.price.nickname,
        interval: lineItem.price.recurring?.interval,
        intervalCount: lineItem.price.recurring?.interval_count,
      };

      console.log(`Price ID extraido: ${priceInfo.priceId}`);
      console.log(
        `Precio: ${priceInfo.amount / 100} ${priceInfo.currency.toUpperCase()}`
      );

      res.json(priceInfo);
    } catch (error: any) {
      console.error("Error extracting Price ID:", error);
      res.status(500).json({ message: "Error extracting Price ID: " + error.message });
    }
  });
}
