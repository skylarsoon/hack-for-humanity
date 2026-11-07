import { describe, expect, it } from "vitest";
import { SAMPLE_DELAY_MS, sampleDocument, supportedPhoto, validApproval } from "@/lib/minga-documents";
import { BASE_ASSISTED, BASE_SPENT_USD, USD_TO_COP } from "@/lib/nido-data";
import { deliveryReducer, initialDeliveryState } from "@/lib/nido-delivery";

describe("Minga document rules", () => {
  it("uses the requested 1.5-second sample delay", () => expect(SAMPLE_DELAY_MS).toBe(1500));
  it("matches Maria Gomez to HH_01 at 92% with 12 uncertain zinc sheets", () => {
    const doc = sampleDocument("census");
    expect(doc.entity_resolution?.matched_family_id).toBe("HH_01");
    expect(doc.entity_resolution?.similarity_score).toBe(0.92);
    expect(doc.line_items[0]?.qty).toBe(12);
    expect(doc.low_confidence_warnings.length).toBeGreaterThan(0);
  });
  it("does not resolve hardware receipts as duplicate households", () => {
    expect(sampleDocument("factura").entity_resolution).toBeNull();
    expect(sampleDocument("acta").entity_resolution?.matched_family_id).toBe("HH_03");
  });
  it("requires a real selected household and valid reviewed values", () => {
    expect(validApproval(sampleDocument("factura"), ["HH_05"])).toBe(false);
    expect(validApproval({ ...sampleDocument("factura"), household: "HH_05" }, ["HH_05"])).toBe(true);
    expect(validApproval({ ...sampleDocument("acta"), line_items: [{ item: "Tejas de Zinc", qty: -1, category: "roof" as const }] }, ["HH_03"])).toBe(false);
    expect(validApproval({ ...sampleDocument("acta"), line_items: [] }, ["HH_03"])).toBe(false);
    expect(validApproval({ ...sampleDocument("acta"), cop: 0 }, ["HH_03"])).toBe(false);
    expect(validApproval({ ...sampleDocument("census"), cop: 0 }, ["HH_01"])).toBe(true);
  });
  it("accepts PNG and JPG photos only", () => {
    expect(supportedPhoto("image/png")).toBe(true);
    expect(supportedPhoto("image/jpeg")).toBe(true);
    expect(supportedPhoto("application/pdf")).toBe(false);
  });
  it("converts at 3230 COP per USD and atomically updates delivery, phase ledger and totals", () => {
    const doc = sampleDocument("acta");
    expect(USD_TO_COP).toBe(3230);
    const action = { householdId: "HH_03", items: doc.line_items.map((l) => l.item), usd: Math.round(doc.cop / USD_TO_COP), vendor: doc.vendor, receipt: "ACTA-TEST", id: "exp-test", date: "2026-11-07" };
    const state = deliveryReducer(initialDeliveryState(), action);
    expect(state.households.find((h) => h.id === "HH_03")?.status).toBe("delivered");
    expect(state.expenses[0]?.usd).toBe(182);
    expect(state.expenses[0]?.phase).toBe(1);
    expect(BASE_ASSISTED + state.extraAssisted).toBe(53);
    expect(BASE_SPENT_USD + state.extraSpent).toBe(31382);
    expect(deliveryReducer(state, action)).toBe(state);
    expect(deliveryReducer(state, { ...action, receipt: "ACTA-SECOND", id: "exp-second" }).extraAssisted).toBe(1);
  });
});