import { getAnthropicClient } from "./client";
import { MERGE_SYSTEM_PROMPT, buildMergePrompt } from "./prompts";
import { aiMergeResponseSchema, type AIMergeResponse } from "./types";

/**
 * Merge new content into an existing article using AI.
 *
 * @param existingContent - The current article content
 * @param newContent - The new markdown content to merge in
 * @returns Merged article with change summary
 */
export async function mergeContent(
  existingContent: string,
  newContent: string
): Promise<AIMergeResponse> {
  const client = getAnthropicClient();

  if (!client) {
    return fallbackMerge(existingContent, newContent);
  }

  const userPrompt = buildMergePrompt(existingContent, newContent);

  try {
    const message = await client.messages.create({
      model: process.env.AI_MODEL || "deepseek-v4-pro",
      max_tokens: 8192,
      temperature: 0.3,
      system: MERGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

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
      return fallbackMerge(existingContent, newContent);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return aiMergeResponseSchema.parse(parsed);
  } catch (error) {
    console.error("AI merge failed:", error);
    return fallbackMerge(existingContent, newContent);
  }
}

/**
 * Stream-based merge that yields progress events.
 */
export async function* mergeContentStream(
  existingContent: string,
  newContent: string
): AsyncGenerator<
  | { type: "progress"; step: string; message: string }
  | { type: "complete"; result: AIMergeResponse }
  | { type: "error"; message: string }
> {
  yield {
    type: "progress",
    step: "analyzing",
    message: "Analyzing existing article and new content...",
  };

  const client = getAnthropicClient();

  if (!client) {
    const result = fallbackMerge(existingContent, newContent);
    yield { type: "complete", result };
    return;
  }

  const userPrompt = buildMergePrompt(existingContent, newContent);

  yield {
    type: "progress",
    step: "calling_ai",
    message: "Calling AI to merge content...",
  };

  try {
    const stream = await client.messages.create({
      model: process.env.AI_MODEL || "deepseek-v4-pro",
      max_tokens: 8192,
      temperature: 0.3,
      system: MERGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    });

    yield {
      type: "progress",
      step: "processing_response",
      message: "Processing merge result...",
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

    let jsonText = fullText.trim();

    // If response starts with ```, strip the outermost markdown fence
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
      yield { type: "error", message: "AI merge response invalid" };
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = aiMergeResponseSchema.parse(parsed);
    yield { type: "complete", result: validated };
  } catch (error) {
    console.error("AI merge stream failed:", error);
    yield {
      type: "error",
      message:
        error instanceof Error ? error.message : "Unknown merge error",
    };
  }
}

/**
 * Fallback when AI is unavailable: append new content to existing.
 */
function fallbackMerge(
  existingContent: string,
  newContent: string
): AIMergeResponse {
  return {
    mergedContent: `${existingContent}\n\n---\n\n## Added Content\n\n${newContent}`,
    summary: "New content appended (AI was unavailable for smart merge)",
    changeHighlights: ["New content appended to end of article"],
  };
}
