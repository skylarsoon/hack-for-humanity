import { describe, expect, it } from "vitest";
import { fieldHouseholdIds, validateFieldHouseholdId } from "@/lib/field-household-ids";

describe("Private field household IDs", () => {
  it("exposes IDs rather than identifying household details", () => {
    const household = { id: "HH_01", name: "Familia Gómez", vereda: "Vereda La Maizena" };
    expect(fieldHouseholdIds([household], [])).toEqual(["HH_01"]);
  });

  it("includes an unlisted ID as a selectable option", () => {
    const result = validateFieldHouseholdId("HH_09", ["HH_01"]);
    expect(result).toEqual({ id: "HH_09" });
    expect(fieldHouseholdIds([{ id: "HH_01" }], [result.id ?? ""])).toEqual(["HH_01", "HH_09"]);
  });

  it("rejects personal names instead of treating them as IDs", () => {
    expect(validateFieldHouseholdId("Familia Gómez", []).error).toBeTruthy();
  });

  it("rejects a duplicate ID", () => {
    expect(validateFieldHouseholdId(" HH_01 ", ["HH_01"]).error).toBeTruthy();
  });
});
import { fieldHouseholdLabel, validateFieldSurname } from "@/lib/field-household-ids";
describe("field surname labels", () => {
  it("shows ID with family surname on the mobile list", () => {
    expect(fieldHouseholdLabel("HH_01", [{ id: "HH_01", name: "Familia Gómez" }], {})).toBe("HH_01 · Gómez");
  });
  it("uses the surname typed for a newly added ID", () => {
    expect(fieldHouseholdLabel("HH_09", [], { HH_09: "Ramírez" })).toBe("HH_09 · Ramírez");
  });
  it("rejects phone numbers in the surname field", () => {
    expect(validateFieldSurname("3001234567").error).toBeTruthy();
  });
});
