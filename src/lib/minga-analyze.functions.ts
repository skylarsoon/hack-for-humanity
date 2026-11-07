import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MingaDoc } from "./minga-documents";
import { toMingaDoc } from "./minga-extraction";
import { BUSY_COOLDOWN_MS, MISSING_COOLDOWN_MS, createCooldown } from "./model-cooldown";
import { buildPrompt, providerOrder, targetId } from "./minga-schema";
import { callClaude, callGemini, type ProviderResult } from "./minga-providers.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  mimeType: z.enum(["image/png", "image/jpeg"]),
  base64: z.string().min(1).max(14_000_000),
  households: z.array(z.object({ id: z.string().max(40), name: z.string().max(120) })).max(500),
});

// Shared across requests in this server process: a model that just failed is skipped for a while.
const cooldown = createCooldown();

type Result = { doc: MingaDoc | null; error: string | null };
const fail = (error: string): Result => ({ doc: null, error });

export const analyzeMingaDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const targets = providerOrder(process.env);
    if (!targets.length) return fail("No AI key is configured. Set ANTHROPIC_API_KEY (or GEMINI_API_KEY) in .env.local.");
    const candidates = targets.filter((t) => !cooldown.isCooling(targetId(t)));
    if (!candidates.length) return fail("The AI reader is busy right now. Try again in a minute.");

    const input = { prompt: buildPrompt(data.households.map((h) => `${h.id}|${h.name}`).join("\n")), mimeType: data.mimeType, base64: data.base64 };
    let busy = false;
    let unavailable: string | null = null;
    for (const target of candidates) {
      const key = process.env[target.provider === "claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"]!;
      const res: ProviderResult = target.provider === "claude" ? await callClaude(key, target.model, input) : await callGemini(key, target.model, input);
      if (res.ok) {
        let raw: unknown;
        try { raw = JSON.parse(res.text); } catch { return fail("The AI returned an unreadable result for this photo."); }
        const mapped = toMingaDoc(raw, data.households);
        return "doc" in mapped ? { doc: mapped.doc, error: null } : fail(mapped.error);
      }
      if (res.kind === "fatal") return fail(res.message);
      if (res.kind === "busy") { cooldown.mark(targetId(target), BUSY_COOLDOWN_MS); busy = true; }
      else { cooldown.mark(targetId(target), MISSING_COOLDOWN_MS); unavailable ??= res.message; }
    }
    if (busy) return fail("The AI reader is busy right now. Try again in a minute.");
    return fail(unavailable ?? "No AI model could read this photo.");
  });
