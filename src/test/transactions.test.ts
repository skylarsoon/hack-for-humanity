import { describe, expect, it } from "vitest";
import { latestTransactions } from "@/lib/transactions";
import type { Expense } from "@/lib/nido-data";

const base: Expense = { id: "a", date: "2026-11-01", vendor: "Ferretería", method: "Factura", description: "tejas", usd: 100, phase: 1, householdIds: ["HH_01"], receipt: "R-1" };

describe("latest transactions", () => {
  it("sorts newest first by created time, then date, and limits the list", () => {
    const rows = latestTransactions([
      { ...base, id: "old", createdAt: "2026-11-01T09:00:00Z" },
      { ...base, id: "new", date: "2026-11-07", createdAt: "2026-11-07T09:00:00Z" },
      { ...base, id: "nodate-created", date: "2026-11-05" },
    ], 2);
    expect(rows.map((r) => r.id)).toEqual(["new", "nodate-created"]);
  });
  it("labels a mixed receipt by its largest category and lists quantities", () => {
    const [r] = latestTransactions([{ ...base, source: "ai", items: [{ item: "Tejas de zinc", qty: 10, category: "roof" }, { item: "Lámpara", qty: 1, category: "energy" }] }]);
    expect(r?.category).toBe("roof");
    expect(r?.items).toBe("10× Tejas de zinc, Lámpara");
    expect(r?.kind).toBe("verified");
  });
  it("falls back to the description and marks browser-only entries", () => {
    const rows = latestTransactions([{ ...base, id: "s", receipt: "SAMPLE-1", description: "Lámpara solar" }, { ...base, id: "f", receipt: "CAMPO-1" }]);
    expect(rows.find((r) => r.id === "s")).toMatchObject({ category: "energy", kind: "demo" });
    expect(rows.find((r) => r.id === "f")?.kind).toBe("session");
  });
});
