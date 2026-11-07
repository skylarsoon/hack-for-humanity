import { describe, expect, it } from "vitest";
import { seedExpenses, seedHouseholds } from "@/lib/nido-data";
import { validateFieldHouseholdId } from "@/lib/field-household-ids";

describe("HH household ID format", () => {
  it("uses HH IDs for every existing household", () => {
    expect(seedHouseholds().map((household) => household.id)).toEqual([
      "HH_01", "HH_02", "HH_03", "HH_04", "HH_05", "HH_06", "HH_07", "HH_08",
    ]);
  });

  it("keeps all expense references attached to existing HH households", () => {
    const ids = seedHouseholds().map((household) => household.id);
    const references = seedExpenses().flatMap((expense) => expense.householdIds);
    expect(references.length).toBe(11);
    for (const id of references) expect(ids).toContain(id);
  });

  it("accepts the requested HH_00 format", () => {
    expect(validateFieldHouseholdId("HH_00", [])).toEqual({ id: "HH_00" });
  });

  it("normalizes lowercase input to the uppercase HH prefix", () => {
    expect(validateFieldHouseholdId(" hh_09 ", [])).toEqual({ id: "HH_09" });
  });

  it("rejects the replaced fam prefix", () => {
    expect(validateFieldHouseholdId("fam_09", []).error).toBeTruthy();
  });
});