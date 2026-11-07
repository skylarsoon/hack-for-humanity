import { describe, expect, it } from "vitest";
import { buildSurvey } from "@/lib/field-surveys";

describe("buildSurvey", () => {
  it("shows only selected categories between general and final", () => {
    const s = buildSurvey(["Panel Solar", "Tejas de Zinc"]);
    expect(s.map((x) => x.key)).toEqual(["general", "Tejas de Zinc", "Panel Solar", "final"]);
  });
  it("offers selected needs as priority options", () => {
    const s = buildSurvey(["Recreación"]);
    expect(s.at(-1)?.questions[0]?.options).toEqual(["Recreación"]);
  });
});
