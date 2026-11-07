// Pure helpers shared by the analyze server function and its tests: the extraction schema, prompt and provider order.

export const CATEGORY_IDS = ["roof", "water", "energy", "rebuild", "heal"] as const;

/** Standard JSON Schema. Claude takes it as-is (strict structured outputs); Gemini gets toGeminiSchema(). */
export const extractionSchema = {
  type: "object",
  properties: {
    doc_type: { type: "string", enum: ["CENSUS_FORM", "SIGNED_ACTA", "HARDWARE_RECEIPT"] },
    title: { type: "string" },
    transcription: { type: "string", description: "Faithful transcription of all legible text, line by line" },
    household: { type: "string", description: "Matching household id from the list, or empty string" },
    line_items: {
      type: "array",
      description: "One entry per distinct item line on the document",
      items: {
        type: "object",
        properties: { item: { type: "string" }, qty: { type: "integer" }, category: { type: "string", enum: [...CATEGORY_IDS] } },
        required: ["item", "qty", "category"],
        additionalProperties: false,
      },
    },
    total_cop: { type: "number", description: "Document total in whole Colombian pesos (printed total if present, else sum of lines)" },
    vendor: { type: "string" },
    low_confidence_warnings: { type: "array", items: { type: "string" } },
    match_score: { type: "number", description: "0-1 confidence of household match" },
    match_explanation: { type: "string" },
  },
  required: ["doc_type", "title", "transcription", "household", "line_items", "total_cop", "vendor", "low_confidence_warnings", "match_score", "match_explanation"],
  additionalProperties: false,
} as const;

/** Gemini's responseSchema wants upper-case type names and rejects additionalProperties. */
export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([k]) => k !== "additionalProperties")
      .map(([k, v]) => [k, k === "type" && typeof v === "string" ? v.toUpperCase() : toGeminiSchema(v)]),
  );
}

export const buildPrompt = (list: string) => `You read disaster-relief paperwork from Pijao, Quindío, Colombia (Spanish, often handwritten, often photographed at an angle).

Step 1 - Classify: CENSUS_FORM (household needs list), SIGNED_ACTA (signed delivery receipt) or HARDWARE_RECEIPT (store factura).
Step 2 - Transcribe all legible text into "transcription" first, line by line.
Step 3 - Extract EVERY item line into line_items with its quantity. Do not collapse several items into one.
Step 4 - Give each line a category: roof (zinc sheets, tejas, roofing), water (water/hygiene kits), energy (solar lamps/panels), rebuild (wood, guadua, bahareque, cement, tools for building), heal (seeds, gardens, first aid, recreation).

Number rules (Colombian format): "." separates thousands and "," separates decimals, so "$226.100" is 226100 pesos, never 226.1. Amounts are whole pesos. For total_cop use the printed TOTAL when there is one; do not use a unit price. If no total is printed, sum the lines.
Handwriting: if a digit or word is crossed out, overwritten or ambiguous, pick the most likely reading and add a low_confidence_warning naming the competing readings (e.g. "quantity looks like 12 or 17 tejas").

Household match: ignore accents and surname/first-name order. Return the household id only when you are reasonably sure, otherwise "".
Households (id|name):
${list}

Example - factura "FERRETERIA PIJAO / 2 lámparas solares / TOTAL $226.100" -> HARDWARE_RECEIPT, line_items [{item:"Lámpara solar", qty:2, category:"energy"}], total_cop 226100, household "".
Example - handwritten census "Maria Gomez, necesita 12 (¿17?) tejas de zinc" -> CENSUS_FORM, line_items [{item:"Tejas de zinc", qty:12, category:"roof"}], a warning about 12 vs 17, household matched to the Gómez family.`;

export type Provider = "claude" | "gemini";
export interface Target { provider: Provider; model: string }

export const CLAUDE_DEFAULT_MODEL = "claude-haiku-5-5";
export const GEMINI_DEFAULT_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
export const targetId = (t: Target) => `${t.provider}:${t.model}`;

type Env = Record<string, string | undefined>;

/**
 * Models to try, in order. Claude Haiku goes first when ANTHROPIC_API_KEY is set; Gemini follows as a fallback when its key is set.
 * AI_PROVIDER=claude or AI_PROVIDER=gemini limits it to one provider. CLAUDE_MODEL / GEMINI_MODEL override the first choice.
 */
export function providerOrder(env: Env): Target[] {
  const only = env["AI_PROVIDER"];
  const targets: Target[] = [];
  if (env["ANTHROPIC_API_KEY"] && only !== "gemini") {
    for (const model of new Set([env["CLAUDE_MODEL"], CLAUDE_DEFAULT_MODEL].filter(Boolean) as string[])) targets.push({ provider: "claude", model });
  }
  if (env["GEMINI_API_KEY"] && only !== "claude") {
    for (const model of new Set([env["GEMINI_MODEL"], ...GEMINI_DEFAULT_MODELS].filter(Boolean) as string[])) targets.push({ provider: "gemini", model });
  }
  return targets;
}
