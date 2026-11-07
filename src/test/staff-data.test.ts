import { describe, expect, it } from "vitest";
import { documentSource, summarize, toCsv, type StaffData } from "@/lib/staff-data";
import { HAZARD_ITEM, fieldNeedItems } from "@/lib/field-sync";

describe("field sync needs", () => {
  it("turns supply tiles into priced needs and drops hazard alerts and duplicates", () => {
    const needs = fieldNeedItems(["Tejas de Zinc", HAZARD_ITEM, "Lámpara Solar", "Tejas de Zinc"]);
    expect(needs).toEqual([
      { item: "Tejas de Zinc", qty: 1, category: "roof", unit_usd: 26 },
      { item: "Lámpara Solar", qty: 1, category: "energy", unit_usd: 35 },
    ]);
    expect(fieldNeedItems([HAZARD_ITEM])).toEqual([]);
  });
});

describe("coordinator dashboard data", () => {
  const data = {
    households: [{ status: "needs" }, { status: "delivered" }, { status: "delivered" }],
    needs: [{ status: "open", qty: 2, unit_usd: 26 }, { status: "delivered", qty: 1, unit_usd: 100 }, { status: "open", qty: 1, unit_usd: 35 }],
    expenses: [{ usd: 1000, source: "seed" }, { usd: 70.5, source: "ai" }],
    documents: [{}, {}],
  } as unknown as StaffData;
  it("summarizes spend, open needs and families", () => {
    expect(summarize(data)).toMatchObject({ households: 3, needsHelp: 1, delivered: 2, spentUsd: 1070.5, newSpentUsd: 70.5, openNeedCount: 2, openNeedsUsd: 87, documents: 2 });
  });
  it("tells field entries from workbench documents", () => {
    expect(documentSource({ extracted: { source: "field" } })).toBe("field");
    expect(documentSource({ extracted: { vendor: "x" } })).toBe("workbench");
    expect(documentSource({ extracted: null })).toBe("workbench");
  });
  it("escapes CSV cells with commas, quotes and newlines", () => {
    const csv = toCsv([{ key: "a", label: "A" }, { key: "b", label: "B, label" }], [{ a: 'say "hi"', b: "line1\nline2" }, { a: null, b: 5 }]);
    expect(csv).toBe('A,"B, label"\n"say ""hi""","line1\nline2"\n,5');
  });
});
