// Thin wrapper around Anthropic /v1/messages with retry-with-jitter on 429/5xx.
// Used by all three LLM actions: generateCanvas, chatRefine, synthesize.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";

type MessageRole = "user" | "assistant";

export interface AnthropicMessage {
  role: MessageRole;
  content: string;
}

export interface AnthropicCallOptions {
  messages: AnthropicMessage[];
  maxTokens: number;
  temperature?: number;
  system?: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

const RETRY_DELAYS_MS = [1000, 3000, 8000];

function jitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * (baseMs * 0.3));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callAnthropic(
  options: AnthropicCallOptions
): Promise<{ text: string; usage?: { input_tokens: number; output_tokens: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set in Convex env");
  }

  const body = {
    model: MODEL,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    messages: options.messages,
    ...(options.system ? { system: options.system } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = (await response.json()) as AnthropicResponse;
        const text = data.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
        return { text, usage: data.usage };
      }

      // Retry on 429 or 5xx
      const isRetryable = response.status === 429 || response.status >= 500;
      const errText = await response.text();
      lastError = new Error(`Anthropic ${response.status}: ${errText}`);

      if (!isRetryable || attempt === RETRY_DELAYS_MS.length) {
        throw lastError;
      }

      await sleep(jitter(RETRY_DELAYS_MS[attempt]));
    } catch (err) {
      // Network errors: also retry up to the limit
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === RETRY_DELAYS_MS.length) {
        throw lastError;
      }
      await sleep(jitter(RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError ?? new Error("Anthropic call failed for unknown reason");
}
