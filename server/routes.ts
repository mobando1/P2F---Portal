import type { Express } from "express";
import express from "express";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import { registerClassRoutes } from "./routes/classes";
import { registerStripeRoutes } from "./routes/stripe";
import { registerTutorRoutes } from "./routes/tutors";
import { registerHighLevelRoutes } from "./routes/highlevel";
import { registerContactRoutes } from "./routes/contact";
import { registerReviewRoutes } from "./routes/reviews";
import { registerAiTutorRoutes } from "./routes/ai-tutor";
import { registerDevRoutes } from "./routes/dev";

export async function registerRoutes(app: Express): Promise<void> {
  // Serve static files from attached_assets
  app.use("/attached_assets", express.static("attached_assets"));

  // Register route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerClassRoutes(app);
  registerStripeRoutes(app);
  registerTutorRoutes(app);
  registerHighLevelRoutes(app);
  registerContactRoutes(app);
  registerReviewRoutes(app);
  registerAiTutorRoutes(app);

  // Development-only routes
  if (process.env.NODE_ENV === "development") {
    registerDevRoutes(app);
  }
}
