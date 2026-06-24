import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteShorthandOptions,
} from "fastify";
import type { ZodTypeAny } from "zod";
import type { ToolDefinition, AuthenticatedRequest } from "./types.js";
import { validateParams } from "./schema-utils.js";
import { toolRegistry } from "./registry.js";
import { requireRole } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rate-limit.js";

// ============================================================
// Tool Router Factory
// ============================================================

/**
 * Options for creating a route from a tool definition.
 */
export interface ToolRouteOptions {
  /** HTTP method */
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** Route path (relative to /api/tools), e.g. "/articles" or "/articles/:id" */
  path: string;
  /**
   * Where to source parameters from:
   * - "body": JSON body (POST/PATCH)
   * - "query": query string (GET)
   * - "merged": merge query, body, and URL params
   */
  paramSource?: "body" | "query" | "merged";
  /** Additional Fastify route options (schema validation, etc.) */
  fastifyOptions?: RouteShorthandOptions;
  /** Override the tool's rate limit (false to disable) */
  rateLimit?:
    | { max: number; windowSeconds: number }
    | false;
}

/**
 * Register a single tool as a Fastify route.
 *
 * Automatically injects:
 * - Auth check (based on tool.permission)
 * - Rate limiting (based on tool.rateLimit)
 * - Parameter validation (Zod schema)
 * - Error handling
 */
export function createToolRoute(
  app: FastifyInstance,
  tool: ToolDefinition,
  options: ToolRouteOptions
): void {
  const { method, path, paramSource = "body", fastifyOptions = {} } = options;

  const fullPath = `/api/tools${path}`;

  // Build preHandler chain
  const preHandlers: Array<
    (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  > = [];

  // 1. Auth: if tool requires more than guest access
  if (tool.permission !== "guest") {
    preHandlers.push(requireRole(tool.permission));
  }

  // 2. Rate limiting
  const rlConfig = options.rateLimit ?? tool.rateLimit;
  if (rlConfig) {
    preHandlers.push(createRateLimiter(tool.name, rlConfig));
  }

  // Route handler
  const handler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract raw params
      const rawParams = extractParams(req, paramSource);

      // Validate with Zod
      const [params, error] = validateParams(tool.schema, rawParams);
      if (error) {
        await reply.status(400).send({
          success: false,
          error: `参数校验失败: ${error}`,
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Call the tool handler
      const result = await tool.handler(
        params,
        req as AuthenticatedRequest,
        reply
      );

      // If the handler already used reply (e.g., redirect), don't send again
      if (reply.sent) return;

      // Wrap in standard response format
      await reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      // Log the error
      req.log.error(
        { err, tool: tool.name },
        `Tool "${tool.name}" execution failed`
      );

      // Don't leak internal errors to the client
      const status = err.statusCode ?? 500;
      const message =
        status === 500
          ? "服务器内部错误，请稍后重试"
          : err.message ?? "Unknown error";

      await reply.status(status).send({
        success: false,
        error: message,
        code: status === 500 ? "INTERNAL_ERROR" : "TOOL_ERROR",
      });
    }
  };

  // Register the route
  const routeOptions: RouteShorthandOptions = {
    ...fastifyOptions,
    preHandler: [
      ...(fastifyOptions.preHandler
        ? (Array.isArray(fastifyOptions.preHandler)
            ? fastifyOptions.preHandler
            : [fastifyOptions.preHandler])
        : []),
      ...preHandlers,
    ],
  };

  switch (method) {
    case "GET":
      app.get(fullPath, routeOptions, handler);
      break;
    case "POST":
      app.post(fullPath, routeOptions, handler);
      break;
    case "PATCH":
      app.patch(fullPath, routeOptions, handler);
      break;
    case "DELETE":
      app.delete(fullPath, routeOptions, handler);
      break;
  }
}

/**
 * Register all tools from the registry as routes.
 * Each tool must have been registered with route options via `registerToolWithRoute`.
 */
const toolRouteConfigs = new Map<
  string,
  { tool: ToolDefinition; options: ToolRouteOptions }
>();

/**
 * Register a tool AND its route configuration.
 * This is the primary API — call this instead of `toolRegistry.register()` directly
 * when you want the tool to also have a REST endpoint.
 */
export function registerTool(
  tool: ToolDefinition,
  routeOptions: ToolRouteOptions
): void {
  toolRegistry.register(tool);
  toolRouteConfigs.set(tool.name, { tool, options: routeOptions });
}

/**
 * Mount all registered tool routes on the Fastify app.
 * Call this once after all tools are registered.
 */
export function mountAllToolRoutes(app: FastifyInstance): void {
  for (const [, { tool, options }] of toolRouteConfigs) {
    createToolRoute(app, tool, options);
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extract parameters from the request based on the param source.
 */
function extractParams(
  req: FastifyRequest,
  source: "body" | "query" | "merged"
): Record<string, unknown> {
  switch (source) {
    case "body":
      return (req.body as Record<string, unknown>) ?? {};
    case "query":
      return (req.query as Record<string, unknown>) ?? {};
    case "merged":
      return {
        ...((req.query as Record<string, unknown>) ?? {}),
        ...((req.body as Record<string, unknown>) ?? {}),
        ...((req.params as Record<string, unknown>) ?? {}),
      };
    default:
      return {};
  }
}
