import { getAnthropicClient } from "./client";
import { EDIT_SYSTEM_PROMPT, buildEditPrompt } from "./prompts";

/**
 * Stream-based AI article editing that yields progress events.
 * Takes the current article content + user instruction, returns the modified content.
 */
export async function* editContentStream(
  content: string,
  instruction: string,
  history?: { role: "user" | "assistant"; content: string }[]
): AsyncGenerator<
  | { type: "progress"; step: string; message: string }
  | { type: "complete"; result: { editedContent: string } }
  | { type: "error"; message: string }
> {
  yield { type: "progress", step: "analyzing", message: "Analyzing your instruction..." };

  const client = getAnthropicClient();

  if (!client) {
    yield {
      type: "progress",
      step: "complete",
      message: "AI unavailable — content unchanged",
    };
    yield { type: "complete", result: { editedContent: content } };
    return;
  }

  const userPrompt = buildEditPrompt(content, instruction, history);

  yield {
    type: "progress",
    step: "calling_ai",
    message: "AI is editing the article...",
  };

  try {
    const stream = await client.messages.create({
      model: process.env.AI_MODEL || "deepseek-v4-pro",
      max_tokens: 16384,
      temperature: 0.3,
      system: EDIT_SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: userPrompt }],
      stream: true,
    });

    yield {
      type: "progress",
      step: "processing_response",
      message: "Receiving modified content...",
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

    // The response should be raw markdown content.
    // Strip any leading/trailing markdown fences or whitespace
    let editedContent = fullText.trim();

    // If the model wrapped it in ``` fences, strip them
    if (editedContent.startsWith("```")) {
      const firstNewline = editedContent.indexOf("\n");
      if (firstNewline !== -1) {
        const lastFence = editedContent.lastIndexOf("```");
        if (lastFence > firstNewline) {
          editedContent = editedContent.substring(firstNewline + 1, lastFence).trim();
        }
      }
    }

    // If no meaningful content returned, fall back to original
    if (!editedContent || editedContent.length < 10) {
      yield { type: "complete", result: { editedContent: content } };
      return;
    }

    yield { type: "complete", result: { editedContent } };
  } catch (error) {
    console.error("AI edit stream failed:", error);
    yield {
      type: "error",
      message:
        error instanceof Error ? error.message : "Unknown AI editing error",
    };
  }
}
