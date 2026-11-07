import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MingaDoc } from "./minga-documents";
import { toMingaDoc } from "./minga-extraction";

const Input = z.object({
  mimeType: z.enum(["image/png", "image/jpeg"]),
  base64: z.string().min(1).max(14_000_000),
  households: z.array(z.object({ id: z.string().max(40), name: z.string().max(120) })).max(500),
});

const schema = {
  type: "OBJECT",
  properties: {
    doc_type: { type: "STRING", enum: ["CENSUS_FORM", "SIGNED_ACTA", "HARDWARE_RECEIPT"] },
    title: { type: "STRING" },
    transcription: { type: "STRING", description: "Faithful transcription of all legible text, line by line" },
    household: { type: "STRING", description: "Matching household id from the list, or empty string" },
    line_items: {
      type: "ARRAY",
      description: "One entry per distinct item line on the document",
      items: { type: "OBJECT", properties: { item: { type: "STRING" }, qty: { type: "INTEGER" } }, required: ["item", "qty"] },
    },
    total_cop: { type: "NUMBER", description: "Document total in whole Colombian pesos (printed total if present, else sum of lines)" },
    vendor: { type: "STRING" },
    low_confidence_warnings: { type: "ARRAY", items: { type: "STRING" } },
    match_score: { type: "NUMBER", description: "0-1 confidence of household match" },
    match_explanation: { type: "STRING" },
  },
  required: ["doc_type", "title", "transcription", "household", "line_items", "total_cop", "vendor", "low_confidence_warnings", "match_score", "match_explanation"],
};

// Preferred model first, then fallbacks used when one is overloaded (503) or rate-limited (429).
const MODELS = [...new Set([process.env["GEMINI_MODEL"], "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"].filter(Boolean))] as string[];
const TIMEOUT_MS = 30_000;

const buildPrompt = (list: string) => `You read disaster-relief paperwork from Pijao, Quindío, Colombia (Spanish, often handwritten, often photographed at an angle).

Step 1 - Classify: CENSUS_FORM (household needs list), SIGNED_ACTA (signed delivery receipt) or HARDWARE_RECEIPT (store factura).
Step 2 - Transcribe all legible text into "transcription" first, line by line.
Step 3 - Extract EVERY item line into line_items with its quantity. Do not collapse several items into one.

Number rules (Colombian format): "." separates thousands and "," separates decimals, so "$226.100" is 226100 pesos, never 226.1. Amounts are whole pesos. For total_cop use the printed TOTAL when there is one; do not use a unit price. If no total is printed, sum the lines.
Handwriting: if a digit or word is crossed out, overwritten or ambiguous, pick the most likely reading and add a low_confidence_warning naming the competing readings (e.g. "quantity looks like 12 or 17 tejas").

Household match: ignore accents and surname/first-name order. Return the household id only when you are reasonably sure, otherwise "".
Households (id|name):
${list}

Example - factura "FERRETERIA PIJAO / 2 lámparas solares / TOTAL $226.100" -> HARDWARE_RECEIPT, line_items [{item:"Lámpara solar", qty:2}], total_cop 226100, household "".
Example - handwritten census "Maria Gomez, necesita 12 (¿17?) tejas de zinc" -> CENSUS_FORM, line_items [{item:"Tejas de zinc", qty:12}], a warning about 12 vs 17, household matched to the Gómez family.`;

export const analyzeMingaDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ doc: MingaDoc | null; error: string | null }> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { doc: null, error: "Gemini key is not configured." };
    const prompt = buildPrompt(data.households.map((h) => `${h.id}|${h.name}`).join("\n"));
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: data.mimeType, data: data.base64 } }] }],
            generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
          }),
        },
      );
      if (!res.ok) {
        console.error("Gemini error", res.status, await res.text());
        return { doc: null, error: res.status === 429 ? "Gemini is busy. Try again in a minute." : `Gemini could not read this photo (${res.status}).` };
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { doc: null, error: "Gemini returned no result for this photo." };
      const result = toMingaDoc(JSON.parse(text), data.households);
      return "doc" in result ? { doc: result.doc, error: null } : { doc: null, error: result.error };
    } catch (e) {
      console.error(e);
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return { doc: null, error: "Gemini took too long. Try again." };
      return { doc: null, error: "Could not reach Gemini." };
    }
  });
