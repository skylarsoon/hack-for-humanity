import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MingaDoc } from "./minga-documents";

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
    transcription: { type: "STRING" },
    household: { type: "STRING", description: "Matching household id from the list, or empty string" },
    item: { type: "STRING" },
    qty: { type: "INTEGER" },
    cop: { type: "NUMBER", description: "Total in Colombian pesos" },
    vendor: { type: "STRING" },
    low_confidence_warnings: { type: "ARRAY", items: { type: "STRING" } },
    match_score: { type: "NUMBER", description: "0-1 confidence of household match" },
    match_explanation: { type: "STRING" },
  },
  required: ["doc_type", "title", "transcription", "household", "item", "qty", "cop", "vendor", "low_confidence_warnings", "match_score", "match_explanation"],
};

export const analyzeMingaDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ doc: MingaDoc | null; error: string | null }> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { doc: null, error: "Gemini key is not configured." };
    const list = data.households.map((h) => `${h.id}: ${h.name}`).join("\n");
    const prompt = `You read disaster-relief paperwork from Pijao, Quindío, Colombia (Spanish, often handwritten). Classify the photo as a census form, signed delivery acta, or hardware store receipt. Extract the main item, quantity and total in COP. Match it to one of these households (return its id, or "" if unsure):\n${list}\nAdd a warning for any handwriting you are unsure about.`;
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: data.mimeType, data: data.base64 } }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schema },
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
      const r = JSON.parse(text);
      const ids = data.households.map((h) => h.id);
      const household = ids.includes(r.household) ? r.household : "";
      const matched = data.households.find((h) => h.id === household);
      return {
        error: null,
        doc: {
          title: String(r.title || "Document"),
          preview: String(r.transcription || ""),
          doc_type: r.doc_type,
          household,
          item: String(r.item || ""),
          qty: Math.max(1, Math.round(Number(r.qty) || 1)),
          cop: Math.max(0, Number(r.cop) || 0),
          vendor: String(r.vendor || ""),
          low_confidence_warnings: Array.isArray(r.low_confidence_warnings) ? r.low_confidence_warnings.map(String) : [],
          entity_resolution: matched
            ? { is_potential_duplicate: true, matched_family_id: matched.id, matched_family_name: matched.name, similarity_score: Math.min(1, Math.max(0, Number(r.match_score) || 0)), explanation: String(r.match_explanation || "") }
            : null,
        },
      };
    } catch (e) {
      console.error(e);
      return { doc: null, error: "Could not reach Gemini." };
    }
  });
