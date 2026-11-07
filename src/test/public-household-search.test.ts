import { describe, expect, it } from "vitest";
import { matchesPublicHousehold } from "@/lib/public-household-search";
import { fieldHouseholdIds } from "@/lib/field-household-ids";

const household = { id: "HH_01", name: "Familia Gómez", vereda: "Vereda La Maizena" };

describe("Public household identity", () => {
  it("finds the same household ID used in the mobile selector", () => {
    const [mobileId] = fieldHouseholdIds([household], []);
    expect(mobileId).toBe("HH_01");
    expect(matchesPublicHousehold(household, mobileId ?? "missing")).toBe(true);
  });

  it("does not reveal a household through surname searches", () => {
    expect(matchesPublicHousehold(household, "Gómez")).toBe(false);
  });

  it("still supports searches by vereda", () => {
    expect(matchesPublicHousehold(household, "La Maizena")).toBe(true);
  });
});