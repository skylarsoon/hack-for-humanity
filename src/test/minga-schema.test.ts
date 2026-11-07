import { describe, expect, it } from "vitest";
import { buildPrompt, extractionSchema, providerOrder, targetId, toGeminiSchema } from "@/lib/minga-schema";

describe("extraction schema", () => {
  it("requires every property and forbids extras so Claude's strict mode accepts it", () => {
    expect(extractionSchema.required).toEqual(Object.keys(extractionSchema.properties));
    expect(extractionSchema.additionalProperties).toBe(false);
    expect(extractionSchema.properties.line_items.items.additionalProperties).toBe(false);
  });
  it("converts to Gemini's dialect without mutating the original", () => {
    const g = toGeminiSchema(extractionSchema) as { type: string; additionalProperties?: unknown; properties: { line_items: { type: string; items: { type: string; additionalProperties?: unknown } }; doc_type: { enum: string[] } } };
    expect(g.type).toBe("OBJECT");
    expect(g.additionalProperties).toBeUndefined();
    expect(g.properties.line_items.type).toBe("ARRAY");
    expect(g.properties.line_items.items.type).toBe("OBJECT");
    expect(g.properties.line_items.items.additionalProperties).toBeUndefined();
    expect(g.properties.doc_type.enum).toContain("CENSUS_FORM");
    expect(extractionSchema.type).toBe("object");
  });
  it("puts the household list in the prompt", () => expect(buildPrompt("HH_01|Familia Gómez")).toContain("HH_01|Familia Gómez"));
});

describe("provider order", () => {
  it("tries Claude Haiku first, then Gemini, when both keys are set", () => {
    const ids = providerOrder({ ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g" }).map(targetId);
    expect(ids[0]).toBe("claude:claude-haiku-5-5");
    expect(ids.slice(1).every((i) => i.startsWith("gemini:"))).toBe(true);
  });
  it("uses only the providers that have keys, and honors AI_PROVIDER", () => {
    expect(providerOrder({ GEMINI_API_KEY: "g" }).every((t) => t.provider === "gemini")).toBe(true);
    expect(providerOrder({ ANTHROPIC_API_KEY: "a" }).map(targetId)).toEqual(["claude:claude-haiku-5-5"]);
    expect(providerOrder({ ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g", AI_PROVIDER: "claude" }).every((t) => t.provider === "claude")).toBe(true);
    expect(providerOrder({ ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g", AI_PROVIDER: "gemini" }).every((t) => t.provider === "gemini")).toBe(true);
    expect(providerOrder({})).toEqual([]);
  });
  it("lets CLAUDE_MODEL override the first choice without duplicating it", () => {
    expect(providerOrder({ ANTHROPIC_API_KEY: "a", CLAUDE_MODEL: "claude-sonnet-5-5" }).map(targetId)).toEqual(["claude:claude-sonnet-5-5", "claude:claude-haiku-5-5"]);
    expect(providerOrder({ ANTHROPIC_API_KEY: "a", CLAUDE_MODEL: "claude-haiku-5-5" })).toHaveLength(1);
  });
});
