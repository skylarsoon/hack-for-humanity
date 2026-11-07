import { describe, it, expect } from "vitest";
import { BUILDER_JOBS, createMaterialRequest, verifyBuilder } from "@/lib/builder-jobs";

describe("builder jobs", () => {
  it("rejects a wrong verification code", () => {
    expect(verifyBuilder({ name: "Ana", minga: "Minga 1", code: "1234" }).ok).toBe(false);
  });
  it("accepts a coordinator code", () => {
    expect(verifyBuilder({ name: "Ana", minga: "Minga 1", code: "minga-2026" }).ok).toBe(true);
  });
  it("volunteers pay nothing for materials", () => {
    const r = createMaterialRequest(BUILDER_JOBS[0]!, "org_espejo");
    expect(r.volunteerPays).toBe(0);
    expect(r.paidBy).toBe("Espejo de Agua");
  });
});
