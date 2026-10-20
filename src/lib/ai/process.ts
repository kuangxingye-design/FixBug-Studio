import { getAnthropicClient } from "./client";
import { PROCESS_SYSTEM_PROMPT, buildProcessPrompt } from "./prompts";
import { aiProcessResponseSchema, type AIProcessResponse } from "./types";
import { calculateReadingTime } from "@/lib/utils/reading-time";
import { db } from "@/lib/db";
import { categories, tags } from "@/lib/db/schema";

/**
 * Process raw markdown content through AI to create a structured article.
 *
 * @param rawContent - The raw markdown content from the uploaded file
 * @returns AI-processed article with suggestions
 */
export async function processMarkdown(
  rawContent: string
): Promise<AIProcessResponse> {
  const client = getAnthropicClient();

  if (!client) {
    // Graceful degradation: return raw content as-is with basic suggestions
    return fallbackProcess(rawContent);
  }

  // Fetch existing categories and tags for context
  const existingCategories = await db.select().from(categories).all();
  const existingTags = await db.select().from(tags).all();

  const categoryNames = existingCategories.map((c) => c.name);
  const tagNames = existingTags.map((t) => t.name);

  const userPrompt = buildProcessPrompt(rawContent, categoryNames, tagNames);

  try {
    const message = await client.messages.create({
      model: process.env.AI_MODEL || "deepseek-v4-pro",
      max_tokens: 8192,
      temperature: 0.3,
      system: PROCESS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Parse and validate the JSON response
    let jsonText = textContent.trim();
    if (jsonText.startsWith("```")) {
      const firstNewline = jsonText.indexOf("\n");
      if (firstNewline !== -1) {
        const lastFence = jsonText.lastIndexOf("```");
        if (lastFence > firstNewline) {
          jsonText = jsonText.substring(firstNewline + 1, lastFence).trim();
        }
      }
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("AI response did not contain valid JSON");
      return fallbackProcess(rawContent);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = aiProcessResponseSchema.parse(parsed);

    // Recalculate reading time from actual processed content
    validated.estimatedReadingTime = calculateReadingTime(
      validated.processedContent
    );

    return validated;
  } catch (error) {
    console.error("AI processing failed:", error);
    return fallbackProcess(rawContent);
  }
}

/**
 * Stream-based AI processing that yields progress events.
 * This is used by the SSE endpoint.
 */
export async function* processMarkdownStream(
  rawContent: string
): AsyncGenerator<
  | { type: "progress"; step: string; message: string }
  | { type: "complete"; result: AIProcessResponse }
  | { type: "error"; message: string }
> {
  yield { type: "progress", step: "analyzing", message: "Analyzing content structure..." };

  const client = getAnthropicClient();

  if (!client) {
    const result = fallbackProcess(rawContent);
    yield {
      type: "progress",
      step: "complete",
      message: "AI unavailable — using raw content as-is",
    };
    yield { type: "complete", result };
    return;
  }

  // Fetch existing categories and tags for context
  const existingCategories = await db.select().from(categories).all();
  const existingTags = await db.select().from(tags).all();

  const categoryNames = existingCategories.map((c) => c.name);
  const tagNames = existingTags.map((t) => t.name);

  const userPrompt = buildProcessPrompt(rawContent, categoryNames, tagNames);

  yield {
    type: "progress",
    step: "calling_ai",
    message: "Calling AI to transform your content...",
  };

  try {
    const stream = await client.messages.create({
      model: process.env.AI_MODEL || "deepseek-v4-pro",
      max_tokens: 8192,
      temperature: 0.3,
      system: PROCESS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    });

    yield {
      type: "progress",
      step: "processing_response",
      message: "Processing AI response...",
    };

    let fullText = "";
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
      }
    }

    console.log("[AI] Response received, length:", fullText.length);

    // Try to extract JSON — DeepSeek may or may not wrap it in ``` fences
    let jsonText = fullText.trim();

    // If response starts with ```, strip the outermost markdown fence
    if (jsonText.startsWith("```")) {
      // Find the first newline after the opening fence
      const firstNewline = jsonText.indexOf("\n");
      if (firstNewline !== -1) {
        // Find the LAST ``` (outer fence), not one inside article content
        const lastFence = jsonText.lastIndexOf("```");
        if (lastFence > firstNewline) {
          jsonText = jsonText.substring(firstNewline + 1, lastFence).trim();
          console.log("[AI] Stripped outer markdown fence");
        }
      }
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI] Could not extract JSON. Raw start:", fullText.substring(0, 200));
      yield { type: "error", message: "AI response did not contain valid JSON" };
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[AI] JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
      console.error("[AI] JSON start (first 300 chars):", jsonMatch[0].substring(0, 300));
      yield { type: "error", message: "AI returned malformed JSON" };
      return;
    }

    const validated = aiProcessResponseSchema.parse(parsed);
    console.log("[AI] Title:", validated.suggestedTitle);
    console.log("[AI] Content transformed:", validated.processedContent.trim() !== rawContent.trim());

    // Recalculate reading time from actual processed content
    validated.estimatedReadingTime = calculateReadingTime(
      validated.processedContent
    );

    yield { type: "complete", result: validated };
  } catch (error) {
    console.error("AI processing stream failed:", error);
    yield {
      type: "error",
      message:
        error instanceof Error ? error.message : "Unknown AI processing error",
    };
  }
}

/**
 * Fallback when AI is unavailable: return raw content with placeholder metadata.
 */
function fallbackProcess(rawContent: string): AIProcessResponse {
  const firstLine = rawContent.trim().split("\n")[0].replace(/^#+\s*/, "");
  return {
    processedContent: rawContent,
    suggestedTitle: firstLine || "Untitled Article",
    suggestedTags: ["untagged"],
    suggestedCategory: "Notes",
    suggestedExcerpt: rawContent.substring(0, 200).trim(),
    estimatedReadingTime: calculateReadingTime(rawContent),
  };
}
