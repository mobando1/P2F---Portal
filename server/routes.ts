import type { Express } from "express";
import express from "express";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import { registerClassRoutes } from "./routes/classes";
import { registerStripeRoutes } from "./routes/stripe";
import { registerTutorRoutes } from "./routes/tutors";

import { registerContactRoutes } from "./routes/contact";
import { registerReviewRoutes } from "./routes/reviews";
import { registerAiTutorRoutes } from "./routes/ai-tutor";
import { registerDevRoutes } from "./routes/dev";
import { registerTutorPortalRoutes } from "./routes/tutor-portal";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerSupportRoutes } from "./routes/support";
import { registerMessageRoutes } from "./routes/messages";
import { registerSettingsRoutes } from "./routes/settings";
import { registerCrmRoutes } from "./routes/crm";
import { registerCampaignRoutes } from "./routes/campaigns";
import { registerAnalyticsRoutes } from "./routes/analytics";

export async function registerRoutes(app: Express): Promise<void> {
  // Serve static files from attached_assets
  app.use("/attached_assets", express.static("attached_assets"));

  // Register route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerClassRoutes(app);
  registerStripeRoutes(app);
  registerTutorRoutes(app);

  registerContactRoutes(app);
  registerReviewRoutes(app);
  registerAiTutorRoutes(app);
  registerTutorPortalRoutes(app);
  registerNotificationRoutes(app);
  registerSupportRoutes(app);
  registerMessageRoutes(app);
  registerSettingsRoutes(app);
  registerCrmRoutes(app);
  registerCampaignRoutes(app);
  registerAnalyticsRoutes(app);

  // Development-only routes
  if (process.env.NODE_ENV === "development") {
    registerDevRoutes(app);
  }
}
