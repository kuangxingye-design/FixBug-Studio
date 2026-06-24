import type { ZodTypeAny } from "zod";
import { z } from "zod";

/**
 * Convert a Zod schema to a JSON Schema object suitable for AI tool definitions.
 *
 * Uses Zod's built-in `z.toJSONSchema()` (available in zod ≥ 3.23).
 * Falls back to a simplified converter for older versions.
 */
export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  try {
    // zod ≥ 3.23 has native JSON Schema support via toJSONSchema()
    const result = (z as unknown as { toJSONSchema?: (s: ZodTypeAny) => unknown })
      .toJSONSchema?.(schema);

    if (result && typeof result === "object") {
      return result as Record<string, unknown>;
    }
  } catch {
    // Fall through to manual conversion
  }

  return manualToJsonSchema(schema);
}

/**
 * Simplified manual JSON Schema conversion.
 * Handles common Zod types. Extend as needed.
 */
function manualToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const def = schema._def as Record<string, unknown>;

  // Handle ZodObject
  if (schema instanceof z.ZodObject) {
    const shape = (schema as z.ZodObject<Record<string, ZodTypeAny>>).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = manualToJsonSchema(value);

      // Check if the field is required (not optional, not nullable by default)
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        // We consider non-optional, non-default fields as required
        if (
          !(value instanceof z.ZodNullable) &&
          !(value instanceof z.ZodUndefined)
        ) {
          required.push(key);
        }
      }
    }

    const result: Record<string, unknown> = {
      type: "object",
      properties,
    };

    if (required.length > 0) {
      result.required = required;
    }

    return result;
  }

  // Handle ZodString
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  // Handle ZodNumber
  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  // Handle ZodBoolean
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  // Handle ZodArray
  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: manualToJsonSchema(schema.element),
    };
  }

  // Handle ZodEnum
  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: schema.options,
    };
  }

  // Handle ZodOptional
  if (schema instanceof z.ZodOptional) {
    return manualToJsonSchema(schema.unwrap());
  }

  // Handle ZodNullable
  if (schema instanceof z.ZodNullable) {
    const inner = manualToJsonSchema(schema.unwrap());
    return { ...inner, nullable: true };
  }

  // Handle ZodDefault
  if (schema instanceof z.ZodDefault) {
    return manualToJsonSchema(schema._def.innerType as ZodTypeAny);
  }

  // Handle ZodUnion
  if (schema instanceof z.ZodUnion) {
    return {
      anyOf: schema.options.map((o: ZodTypeAny) => manualToJsonSchema(o)),
    };
  }

  // Handle ZodEffects (refine, transform, etc.)
  if (schema instanceof z.ZodEffects) {
    return manualToJsonSchema(schema.innerType());
  }

  // Fallback
  return { type: "string", description: "Unknown parameter type" };
}

/**
 * Parse and validate parameters using a Zod schema.
 * Returns [parsedData, null] on success, [null, errorMessage] on failure.
 */
export function validateParams<T extends ZodTypeAny>(
  schema: T,
  data: unknown
): [z.infer<T>, null] | [null, string] {
  const result = schema.safeParse(data);
  if (result.success) {
    return [result.data as z.infer<T>, null];
  }
  const errors = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return [null, errors];
}
