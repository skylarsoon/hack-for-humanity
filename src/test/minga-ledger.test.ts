import { describe, expect, it } from "vitest";
import { allocateUsd, censusItemsPayload, copToUsd, expenseItemsPayload, unitUsd, unpricedItems } from "@/lib/minga-ledger";
import { mapLedger } from "@/lib/ledger-map";
import { toMingaDoc } from "@/lib/minga-extraction";

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe("receipt to database rows", () => {
  it("matches supplies ignoring accents and case", () => {
    expect(unitUsd("tejas de zinc")).toBe(26);
    expect(unitUsd("Lámpara solar")).toBe(35);
    expect(unitUsd("tornillos")).toBe(0);
  });
  it("converts COP to USD with cents", () => expect(copToUsd(226100)).toBe(70)) ;
  it("splits a total so the lines sum exactly", () => {
    const items = [{ item: "Tejas de Zinc", qty: 3 }, { item: "Lámpara Solar", qty: 1 }, { item: "Kit Agua/Higiene", qty: 1 }];
    for (const total of [182, 70.01, 0.03, 1234.57]) expect(sum(allocateUsd(items, total))).toBe(total);
    expect(allocateUsd([], 10)).toEqual([]);
  });
  it("falls back to quantity weights when a line has no known price", () => {
    expect(allocateUsd([{ item: "Clavos", qty: 1 }, { item: "Tejas de Zinc", qty: 1 }], 100)).toEqual([50, 50]);
  });
  it("builds rpc payloads", () => {
    const items = [{ item: " Tejas de Zinc ", qty: 12, category: "roof" as const }];
    expect(expenseItemsPayload(items, 100)).toEqual([{ item: "Tejas de Zinc", qty: 12, category: "roof", usd: 100 }]);
    expect(censusItemsPayload(items)).toEqual([{ item: "Tejas de Zinc", qty: 12, category: "roof", unit_usd: 26 }]);
    expect(unpricedItems([...items, { item: "Pintura", qty: 1, category: "rebuild" }])).toEqual(["Pintura"]);
  });
});

describe("ledger mapping and categories", () => {
  it("maps rows and fills missing categories with zero", () => {
    const l = mapLedger(
      [{ id: "e1", date: "2026-11-07", vendor: "V", method: "Factura", description: "d", usd: "70", phase: 1, receipt: "R1", source: "ai", created_at: "2026-11-07T10:00:00Z", expense_households: [{ household_id: "HH_03" }], expense_items: [{ item: "Tejas", qty: 3, category: "roof", usd: 70 }] }],
      [{ category: "roof", spent_usd: 70, needed_usd: "52" }],
    );
    expect(l.expenses[0]).toMatchObject({ usd: 70, householdIds: ["HH_03"], source: "ai" });
    expect(l.totals.roof).toEqual({ spent: 70, needed: 52 });
    expect(l.totals.water).toEqual({ spent: 0, needed: 0 });
  });
  it("estimates a missing total from reference prices and flags it", () => {
    const raw = { doc_type: "SIGNED_ACTA", title: "t", transcription: "", household: "", vendor: "", low_confidence_warnings: [], match_score: 0, match_explanation: "",
      line_items: [{ item: "Tejas de zinc", qty: 10, category: "roof" }, { item: "Lámpara solar", qty: 1, category: "energy" }] };
    const a = toMingaDoc({ ...raw, total_cop: 0 }, []);
    expect("doc" in a && a.doc.cop).toBe((10 * 26 + 35) * 3230);
    expect("doc" in a && a.doc.cop_estimated).toBe(true);
    const b = toMingaDoc({ ...raw, total_cop: 500000 }, []);
    expect("doc" in b && [b.doc.cop, b.doc.cop_estimated]).toEqual([500000, false]);
    const c = toMingaDoc({ ...raw, doc_type: "CENSUS_FORM", total_cop: 0 }, []);
    expect("doc" in c && [c.doc.cop, c.doc.cop_estimated]).toEqual([0, false]);
  });
  it("uses the model's category, and falls back to keywords when it is invalid", () => {
    const raw = { doc_type: "HARDWARE_RECEIPT", title: "t", transcription: "", household: "", total_cop: 1, vendor: "", low_confidence_warnings: [], match_score: 0, match_explanation: "",
      line_items: [{ item: "Tejas de zinc", qty: 2, category: "energy" }, { item: "Tejas de zinc", qty: 2, category: "nonsense" }] };
    const r = toMingaDoc(raw, []);
    expect("doc" in r && r.doc.line_items.map((l) => l.category)).toEqual(["energy", "roof"]);
  });
});
