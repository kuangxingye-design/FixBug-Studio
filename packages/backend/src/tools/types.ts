import type { ZodType, ZodTypeAny } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";

// ============================================================
// Tool Definition — the core interface every tool implements
// ============================================================

/**
 * Permission level required to invoke a tool.
 */
export type ToolPermission = "guest" | "user" | "admin";

/**
 * Side effect classification for AI safety gating.
 */
export type ToolSideEffect = "read" | "write" | "destroy";

/**
 * Confirmation requirement.
 * - never: safe operation, no confirmation needed
 * - always: destructive, must always confirm
 * - conditional: depends on context (e.g. delete own vs delete others)
 */
export type ConfirmationRequirement = "never" | "always" | "conditional";

/**
 * Rate limit configuration for a tool.
 */
export interface ToolRateLimit {
  /** Max requests allowed in the window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Extended Fastify request with user context injected by auth middleware.
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: number;
    email: string;
    role: ToolPermission;
    nickname: string;
  };
  sessionId?: string;
  traceId?: string;
}

/**
 * A tool handler receives validated params, the request context, and the reply.
 * Returns the tool result (will be serialized as JSON).
 */
export type ToolHandler<TParams = unknown, TResult = unknown> = (
  params: TParams,
  req: AuthenticatedRequest,
  reply: FastifyReply
) => Promise<TResult>;

/**
 * Full tool definition — the single source of truth for a capability.
 *
 * Both AI and traditional REST calls use this same definition.
 */
export interface ToolDefinition<
  TParams extends ZodTypeAny = ZodTypeAny,
  TResult = unknown
> {
  /** Unique identifier, snake_case (e.g. "create_article") */
  name: string;

  /** Natural language description for AI to understand the tool's purpose */
  description: string;

  /** Zod schema for runtime validation + TypeScript inference + JSON Schema export */
  schema: TParams;

  /** Minimum permission level required */
  permission: ToolPermission;

  /** Side effect classification */
  sideEffect: ToolSideEffect;

  /** When to show a confirmation card */
  confirmation: ConfirmationRequirement;

  /** Per-tool rate limit (optional — defaults to a generous limit) */
  rateLimit?: ToolRateLimit;

  /** The actual business logic */
  handler: ToolHandler<ZodType["_output"], TResult>;
}

/**
 * A lightweight tool reference — what we expose to AI (schema only, no handler).
 */
export interface ToolDescriptor {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  permission: ToolPermission;
  sideEffect: ToolSideEffect;
  confirmation: ConfirmationRequirement;
}

/**
 * Result of a tool invocation, returned to the caller.
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** If true, the caller should render a confirmation card before proceeding */
  requiresConfirmation?: boolean;
  confirmationCard?: ConfirmationCard;
}

/**
 * Confirmation card — presented to the user before executing destructive actions.
 */
export interface ConfirmationCard {
  id: string;
  title: string;
  summary: string;
  actions: Array<{
    tool: string;
    params: Record<string, unknown>;
  }>;
  confirmText: string;
  cancelText: string;
  expiresIn: number; // seconds
}
