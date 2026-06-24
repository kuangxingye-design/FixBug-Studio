import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { sessionPlugin } from "./middleware/session.js";
import { authMiddleware } from "./middleware/auth.js";
import { registerAllTools } from "./tools/index.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ============================================================
// Plugin Registration
// ============================================================

// CORS
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});

// Cookie parsing (needed for session management)
await app.register(cookie, {
  secret:
    process.env.COOKIE_SECRET || "fixbug-studio-dev-secret-change-in-production",
});

// Session plugin — parses session cookie, makes session available via req.getSession()
await app.register(sessionPlugin);

// ============================================================
// Global Hooks
// ============================================================

// Auth middleware — runs on every request, injects req.user if logged in
app.addHook("onRequest", authMiddleware);

// ============================================================
// Health Check
// ============================================================
app.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// ============================================================
// Tool Routes — register all tools as REST endpoints
// ============================================================
await registerAllTools(app);

// ============================================================
// Graceful Shutdown
// ============================================================
const shutdown = async () => {
  app.log.info("Shutting down...");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ============================================================
// Start Server
// ============================================================
try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server running at http://${HOST}:${PORT}`);
  app.log.info(`Health check: http://${HOST}:${PORT}/api/health`);
  app.log.info(
    `Site config:  http://${HOST}:${PORT}/api/tools/site-config`
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;
