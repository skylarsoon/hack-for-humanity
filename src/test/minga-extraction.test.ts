import { describe, expect, it } from "vitest";
import { parseCop, toMingaDoc } from "@/lib/minga-extraction";

const households = [{ id: "fam_01", name: "Familia Gómez" }];
const base = { doc_type: "HARDWARE_RECEIPT", title: "Factura", transcription: "x", household: "", line_items: [{ item: "Lámpara", qty: 2 }, { item: "Clavos", qty: 1 }], total_cop: 226100, vendor: "Ferretería", low_confidence_warnings: [], match_score: 0, match_explanation: "" };

describe("Gemini extraction mapping", () => {
  it("reads Colombian-formatted amounts", () => {
    expect(parseCop("$226.100")).toBe(226100);
    expect(parseCop("1.007.760,50")).toBe(1007760.5);
    expect(parseCop(587860)).toBe(587860);
    expect(parseCop(null)).toBe(0);
  });
  it("keeps every line item and a string total", () => {
    const r = toMingaDoc({ ...base, total_cop: "$226.100" }, households);
    expect("doc" in r && r.doc.line_items.length).toBe(2);
    expect("doc" in r && r.doc.cop).toBe(226100);
  });
  it("rejects unknown document types", () => {
    expect(toMingaDoc({ ...base, doc_type: "MENU" }, households)).toHaveProperty("error");
  });
  it("drops unknown household ids and only flags real matches as potential duplicates", () => {
    const none = toMingaDoc({ ...base, household: "fam_99" }, households);
    expect("doc" in none && none.doc.household).toBe("");
    expect("doc" in none && none.doc.entity_resolution).toBeNull();
    const low = toMingaDoc({ ...base, household: "fam_01", match_score: 0.2 }, households);
    expect("doc" in low && low.doc.entity_resolution?.is_potential_duplicate).toBe(false);
    const high = toMingaDoc({ ...base, household: "fam_01", match_score: 0.9 }, households);
    expect("doc" in high && high.doc.entity_resolution?.is_potential_duplicate).toBe(true);
  });
});
