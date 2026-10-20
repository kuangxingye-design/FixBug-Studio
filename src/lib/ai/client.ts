import Anthropic from "@anthropic-ai/sdk";

/**
 * Singleton Anthropic client instance.
 * Supports DeepSeek and Anthropic APIs (Anthropic-compatible protocol).
 *
 * Configure via environment variables in .env.local:
 *   ANTHROPIC_API_KEY  — API key (required)
 *   ANTHROPIC_BASE_URL — API endpoint (defaults to Anthropic official)
 *   AI_MODEL           — Model name (defaults to deepseek-v4-pro)
 */
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";

  if (!apiKey || apiKey === "your-deepseek-api-key-here") {
    console.warn("[AI] ANTHROPIC_API_KEY not configured.");
    return null;
  }

  client = new Anthropic({ apiKey, baseURL });
  console.log(`[AI] Connected to ${baseURL} (model: ${process.env.AI_MODEL || "deepseek-v4-pro"})`);
  return client;
}

export function isAIAvailable(): boolean {
  return getAnthropicClient() !== null;
}
