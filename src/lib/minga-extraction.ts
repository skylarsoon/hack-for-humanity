import { z } from "zod";
import { CATEGORIES, categorize, type ImpactCategory } from "./donor-impact";
import { estimateCop } from "./minga-ledger";
import type { MingaDoc } from "./minga-documents";

/** Parses a Colombian-formatted amount: "." groups thousands and "," marks decimals ("$226.100" -> 226100). */
export function parseCop(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^\d.,-]/g, "");
  const n = Number(cleaned.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const Extraction = z.object({
  doc_type: z.enum(["CENSUS_FORM", "SIGNED_ACTA", "HARDWARE_RECEIPT"]),
  title: z.string().catch(""),
  transcription: z.string().catch(""),
  household: z.string().catch(""),
  line_items: z.array(z.object({ item: z.string().catch(""), qty: z.coerce.number().catch(1), category: z.string().catch("") })).catch([]),
  total_cop: z.unknown(),
  vendor: z.string().catch(""),
  low_confidence_warnings: z.array(z.string()).catch([]),
  match_score: z.coerce.number().catch(0),
  match_explanation: z.string().catch(""),
});

export type ExtractionResult = { doc: MingaDoc } | { error: string };

/** Validates raw model JSON and maps it to a MingaDoc; unknown household ids are dropped. */
export function toMingaDoc(raw: unknown, households: { id: string; name: string }[]): ExtractionResult {
  const parsed = Extraction.safeParse(raw);
  if (!parsed.success) return { error: "Gemini returned an unreadable result for this photo." };
  const r = parsed.data;
  const matched = households.find((h) => h.id === r.household);
  const score = Math.min(1, Math.max(0, r.match_score));
  const printed = Math.max(0, parseCop(r.total_cop));
  const lines = r.line_items.map((l) => ({ item: l.item.trim(), qty: Math.max(1, Math.round(l.qty) || 1), category: l.category in CATEGORIES ? (l.category as ImpactCategory) : categorize(l.item) })).filter((l) => l.item);
  return {
    doc: {
      title: r.title || "Document",
      preview: r.transcription,
      doc_type: r.doc_type,
      household: matched?.id ?? "",
      line_items: lines.length ? lines : [{ item: "", qty: 1, category: "heal" }],
      cop: printed || r.doc_type === "CENSUS_FORM" ? printed : Math.round(estimateCop(lines)),
      cop_estimated: !printed && r.doc_type !== "CENSUS_FORM" && estimateCop(lines) > 0,
      vendor: r.vendor,
      low_confidence_warnings: r.low_confidence_warnings,
      entity_resolution: matched
        ? { is_potential_duplicate: score >= 0.5, matched_family_id: matched.id, matched_family_name: matched.name, similarity_score: score, explanation: r.match_explanation }
        : null,
    },
  };
}
