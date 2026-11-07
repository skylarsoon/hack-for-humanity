import Anthropic from "@anthropic-ai/sdk";
import { extractionSchema, toGeminiSchema } from "./minga-schema";

// Server-only: calls one model and reports the outcome in a provider-neutral shape.
//   busy        - overloaded, rate limited or timed out: retry later, try another model now
//   unavailable - this model or key cannot be used (not found, bad key, no credit): skip it for a while
//   fatal       - this document cannot be processed (refusal, bad request): stop, do not try other models
export type ProviderResult = { ok: true; text: string } | { ok: false; kind: "busy" | "unavailable" | "fatal"; message: string };

export interface ProviderInput { prompt: string; mimeType: "image/png" | "image/jpeg"; base64: string }

const TIMEOUT_MS = 30_000;

export async function callClaude(apiKey: string, model: string, input: ProviderInput): Promise<ProviderResult> {
  // maxRetries: 0 - the queue and model cooldown own retrying, so the SDK must not quietly multiply requests.
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: TIMEOUT_MS });
  try {
    // No temperature/top_p: Claude Haiku 5.5 rejects non-default sampling values. Thinking stays on (default) and counts toward max_tokens.
    const message = await client.messages.create({
      model,
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: input.mimeType, data: input.base64 } },
          { type: "text", text: input.prompt },
        ],
      }],
      output_config: { format: { type: "json_schema", schema: extractionSchema as unknown as Record<string, unknown> } },
    });
    if (message.stop_reason === "refusal") return { ok: false, kind: "fatal", message: "Claude declined to read this document." };
    const text = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
    if (!text) {
      return message.stop_reason === "max_tokens"
        ? { ok: false, kind: "busy", message: "Claude ran out of room reading this photo." }
        : { ok: false, kind: "fatal", message: "Claude returned no result for this photo." };
    }
    return { ok: true, text };
  } catch (e) {
    console.error("Claude request failed", model, e instanceof Error ? e.message : e);
    if (e instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, kind: "busy", message: "Claude took too long." };
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, kind: "busy", message: "Could not reach Claude." };
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) return { ok: false, kind: "busy", message: "Claude is busy." };
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, kind: "unavailable", message: "The Claude API key was rejected. Check ANTHROPIC_API_KEY." };
    if (e instanceof Anthropic.NotFoundError) return { ok: false, kind: "unavailable", message: `Claude model "${model}" is not available to this key.` };
    if (e instanceof Anthropic.BadRequestError) {
      if (/credit balance|billing/i.test(e.message)) return { ok: false, kind: "unavailable", message: "The Claude account is out of credit. Add credit in the Anthropic Console." };
      return { ok: false, kind: "fatal", message: `Claude could not read this photo (${e.message.slice(0, 120)}).` };
    }
    return { ok: false, kind: "fatal", message: "Claude could not read this photo." };
  }
}

export async function callGemini(apiKey: string, model: string, input: ProviderInput): Promise<ProviderResult> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: input.prompt }, { inline_data: { mime_type: input.mimeType, data: input.base64 } }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: toGeminiSchema(extractionSchema) },
      }),
    });
    if (!res.ok) {
      console.error("Gemini error", model, res.status, await res.text());
      if (res.status === 404) return { ok: false, kind: "unavailable", message: `Gemini model "${model}" is not available to this key.` };
      if (res.status === 401 || res.status === 403) return { ok: false, kind: "unavailable", message: "The Gemini API key was rejected." };
      if (res.status === 429 || res.status >= 500) return { ok: false, kind: "busy", message: "Gemini is busy." };
      return { ok: false, kind: "fatal", message: `Gemini could not read this photo (${res.status}).` };
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? { ok: true, text } : { ok: false, kind: "fatal", message: "Gemini returned no result for this photo." };
  } catch (e) {
    console.error("Gemini fetch failed", model, e);
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return { ok: false, kind: "busy", message: "Gemini took too long." };
    return { ok: false, kind: "fatal", message: "Could not reach Gemini." };
  }
}
