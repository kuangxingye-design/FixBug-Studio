import type { ZodTypeAny } from "zod";
import type { ToolDefinition, ToolDescriptor } from "./types.js";
import { zodToJsonSchema } from "./schema-utils.js";

/**
 * Central Tool Registry — the single source of truth for all capabilities.
 *
 * Both the AI Agent and traditional REST routes discover tools through this registry.
 * Adding a new capability = registering it here. Nothing else needs to change.
 */
class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Register a tool. Throws if a tool with the same name already exists.
   */
  register<TParams extends ZodTypeAny, TResult>(
    tool: ToolDefinition<TParams, TResult>
  ): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool as unknown as ToolDefinition);
  }

  /**
   * Get a tool by name. Returns undefined if not found.
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get a tool by name, throwing if not found.
   */
  getRequired(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }
    return tool;
  }

  /**
   * List all registered tool names.
   */
  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * List all registered tools.
   */
  listAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Export all tools as lightweight descriptors for the AI Agent.
   * Only includes schema metadata — no handler functions.
   */
  getDescriptors(): ToolDescriptor[] {
    return this.listAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema),
      permission: tool.permission,
      sideEffect: tool.sideEffect,
      confirmation: tool.confirmation,
    }));
  }

  /**
   * Export descriptors filtered by the caller's role.
   * AI should only know about tools the current user can actually use.
   */
  getDescriptorsForRole(role: "guest" | "user" | "admin"): ToolDescriptor[] {
    const roleHierarchy: Record<string, number> = {
      guest: 0,
      user: 1,
      admin: 2,
    };

    return this.getDescriptors().filter((tool) => {
      const required = roleHierarchy[tool.permission] ?? 0;
      const caller = roleHierarchy[role] ?? 0;
      return caller >= required;
    });
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Remove all tools (useful for testing).
   */
  clear(): void {
    this.tools.clear();
  }
}

// Singleton instance — the entire app shares one registry
export const toolRegistry = new ToolRegistry();
