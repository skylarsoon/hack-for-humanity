import { describe, it, expect } from "vitest";
import { categorize, impactByCategory, impactByVereda, whatItBuys } from "@/lib/donor-impact";
import { seedExpenses, seedHouseholds } from "@/lib/nido-data";

describe("donor impact", () => {
  it("puts zinc roof spending under roofing", () => {
    expect(categorize("48 tejas de zinc calibre 33 + clavos")).toBe("roof");
    expect(impactByCategory(seedExpenses()).roof).toBe(1240);
  });
  it("puts water kits under water", () => {
    expect(impactByCategory(seedExpenses()).water).toBe(780);
  });
  it("vereda totals add up to all spending and reveal no household IDs", () => {
    const v = impactByVereda(seedExpenses(), seedHouseholds());
    const sum = Object.values(v).reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(6200);
    expect(Object.keys(v).some((k) => k.startsWith("HH_"))).toBe(false);
  });
  it("$50 buys 1 solar lamp", () => {
    expect(whatItBuys(50).solarLamps).toBe(1);
  });
});

import { regionProgress } from "@/lib/donor-impact";
describe("region progress", () => {
  it("is spent divided by need, capped at 100%", () => {
    expect(regionProgress(4500, 9000)).toBe(50);
    expect(regionProgress(20000, 9000)).toBe(100);
  });
});
