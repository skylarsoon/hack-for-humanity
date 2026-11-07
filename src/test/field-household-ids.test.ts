import { describe, expect, it } from "vitest";
import { fieldHouseholdIds, validateFieldHouseholdId } from "@/lib/field-household-ids";

describe("Private field household IDs", () => {
  it("exposes IDs rather than identifying household details", () => {
    const household = { id: "fam_01", name: "Familia Gómez", vereda: "Vereda La Maizena" };
    expect(fieldHouseholdIds([household], [])).toEqual(["fam_01"]);
  });

  it("includes an unlisted ID as a selectable option", () => {
    const result = validateFieldHouseholdId("fam_09", ["fam_01"]);
    expect(result).toEqual({ id: "fam_09" });
    expect(fieldHouseholdIds([{ id: "fam_01" }], [result.id ?? ""])).toEqual(["fam_01", "fam_09"]);
  });

  it("rejects personal names instead of treating them as IDs", () => {
    expect(validateFieldHouseholdId("Familia Gómez", []).error).toBeTruthy();
  });

  it("rejects a duplicate ID", () => {
    expect(validateFieldHouseholdId(" FAM_01 ", ["fam_01"]).error).toBeTruthy();
  });
});