import type { FastifyInstance } from "fastify";
import { registerTool, mountAllToolRoutes } from "./router.js";
import { getSiteConfigTool } from "./definitions/site-config.js";

// ============================================================
// Tool Registration — register all tools with their routes
// ============================================================

/**
 * Register all tools and mount their routes on the Fastify app.
 * This is the single entry point called from server.ts.
 */
export async function registerAllTools(
  app: FastifyInstance
): Promise<void> {
  // -------------------------------------------------------------------
  // Site Config tools (T-30, T-31)
  // -------------------------------------------------------------------
  registerTool(getSiteConfigTool, {
    method: "GET",
    path: "/site-config",
    paramSource: "query",
  });

  // -------------------------------------------------------------------
  // Mount all registered tool routes
  // -------------------------------------------------------------------
  mountAllToolRoutes(app);

  app.log.info(
    `Tools registered: ${getSiteConfigTool.name} (and more to come)`
  );
}
