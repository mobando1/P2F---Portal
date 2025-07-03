import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { log, setupVite, serveStatic } from "./vite";

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register API routes
  const server = await registerRoutes(app);

  // Setup Vite dev server or serve static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 EspañolPro server running on http://0.0.0.0:${PORT}`);
    log(`📚 Spanish learning platform is ready!`);
  });
}

startServer().catch(console.error);
