import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { log, setupVite, serveStatic } from "./vite";

async function startServer() {
  const app = express();
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
