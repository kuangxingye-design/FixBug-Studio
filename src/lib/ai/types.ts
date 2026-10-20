import { z } from "zod";

/**
 * Zod schema for validating Claude's structured response.
 * The AI prompt instructs Claude to return JSON matching this shape.
 */
export const aiProcessResponseSchema = z.object({
  processedContent: z.string().min(1, "Processed content is required"),
  suggestedTitle: z.string().min(1).max(200),
  suggestedTags: z.array(z.string().min(1)).min(1).max(8),
  suggestedCategory: z.string().min(1),
  suggestedExcerpt: z.string().min(1).max(500),
  estimatedReadingTime: z.number().int().min(1).max(999),
});

export type AIProcessResponse = z.infer<typeof aiProcessResponseSchema>;

export const aiMergeResponseSchema = z.object({
  mergedContent: z.string().min(1),
  summary: z.string().min(1),
  changeHighlights: z.array(z.string()),
});

export type AIMergeResponse = z.infer<typeof aiMergeResponseSchema>;

/**
 * Progress event types for SSE streaming.
 */
export type AIProgressStep =
  | "analyzing"
  | "calling_ai"
  | "processing_response"
  | "complete"
  | "error";

export interface AIProgressEvent {
  step: AIProgressStep;
  message: string;
}

export interface AICompleteEvent {
  result: AIProcessResponse;
}

export interface AIErrorEvent {
  message: string;
}
