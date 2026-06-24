import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

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

// Register plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || "fixbug-studio-dev-secret-change-in-production",
});

// Health check endpoint
app.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Graceful shutdown
const shutdown = async () => {
  app.log.info("Shutting down...");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start server
try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server running at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;
