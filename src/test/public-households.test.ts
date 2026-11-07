import { describe, expect, it } from "vitest";
import { matchesPublicHousehold, publicHouseholdId } from "@/lib/public-households";

describe("Public household privacy", () => {
  it("uses stable numbered household IDs", () => {
    expect(publicHouseholdId("fam_01")).toBe("HH_01");
    expect(publicHouseholdId("fam_08")).toBe("HH_08");
  });

  it("searches by household ID without exposing surnames", () => {
    const household = { id: "fam_01", name: "Familia Gómez", vereda: "Vereda La Maizena" };
    expect(matchesPublicHousehold(household, "HH_01")).toBe(true);
    expect(matchesPublicHousehold(household, "Gómez")).toBe(false);
    expect(matchesPublicHousehold(household, "Maizena")).toBe(true);
  });
});