import { describe, expect, it, vi } from "vitest";
import { MAX_BATCH, attentionReasons, bulkTargets, isApprovable, isBusyError, planBatch, rowState, type QueueItem } from "@/lib/minga-queue";
import { createPool, withRetry } from "@/lib/run-pool";
import { createCooldown } from "@/lib/model-cooldown";
import { sampleDocument } from "@/lib/minga-documents";

const ids = ["HH_01", "HH_03", "HH_05"];
const clean = () => ({ ...sampleDocument("factura"), household: "HH_05", entity_resolution: null });
const item = (over: Partial<QueueItem> = {}): QueueItem => ({ id: "i", fileName: "a.jpg", previewUrl: null, stage: "done", doc: clean(), error: null, note: null, receiptId: "AI-1", acknowledged: false, real: true, ...over });

describe("review flags", () => {
  it("treats a fully matched, priced, unambiguous document as ready", () => {
    expect(attentionReasons(clean(), ids)).toEqual([]);
    expect(rowState(item(), ids)).toBe("ready");
  });
  it("flags each problem separately", () => {
    expect(attentionReasons({ ...clean(), household: "" }, ids)).toContain("Household not matched");
    expect(attentionReasons({ ...clean(), low_confidence_warnings: ["12 or 17?"] }, ids)).toContain("Handwriting doubts");
    expect(attentionReasons({ ...clean(), cop_estimated: true }, ids)).toContain("Total is an estimate");
    expect(attentionReasons({ ...clean(), cop: 0 }, ids)).toContain("No total");
    expect(attentionReasons({ ...clean(), entity_resolution: { ...sampleDocument("census").entity_resolution!, similarity_score: 0.5 } }, ids)[0]).toMatch(/Low household match/);
  });
  it("lets a flagged row be approved only after the reviewer ticks it", () => {
    const flagged = item({ doc: { ...clean(), low_confidence_warnings: ["smudged"] } });
    expect(rowState(flagged, ids)).toBe("attention");
    expect(isApprovable(flagged, ids)).toBe(false);
    expect(isApprovable({ ...flagged, acknowledged: true }, ids)).toBe(true);
  });
  it("never approves invalid fields, even when ticked", () => {
    expect(isApprovable(item({ acknowledged: true, doc: { ...clean(), household: "" } }), ids)).toBe(false);
    expect(isApprovable(item({ stage: "analyzing" }), ids)).toBe(false);
  });
  it("selects only approvable rows for bulk approval", () => {
    const rows = [item({ id: "a" }), item({ id: "b", doc: { ...clean(), cop_estimated: true } }), item({ id: "c", stage: "approved" }), item({ id: "d", stage: "error", doc: null })];
    expect(bulkTargets(rows, ids).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("batch intake", () => {
  const f = (name: string, over = {}) => ({ name, size: 1000, type: "image/jpeg", lastModified: 1, ...over });
  it("rejects wrong types, oversize files, duplicates and the 31st photo", () => {
    const r = planBatch([f("a.jpg"), f("a.jpg"), f("b.pdf", { type: "application/pdf" }), f("c.png", { type: "image/png", size: 11_000_000 })], new Set(), 0);
    expect(r.accepted.map((x) => x.name)).toEqual(["a.jpg"]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["already in the queue", "not a PNG or JPG photo", "larger than 10 MB"]);
    const many = Array.from({ length: 5 }, (_, i) => f(`p${i}.jpg`, { lastModified: i }));
    expect(planBatch(many, new Set(), MAX_BATCH - 2).accepted).toHaveLength(2);
  });
  it("detects busy errors", () => {
    expect(isBusyError("Gemini is busy right now.")).toBe(true);
    expect(isBusyError("Gemini took too long. Try again.")).toBe(true);
    expect(isBusyError("Gemini could not read this photo (400).")).toBe(false);
  });
});

describe("run pool", () => {
  it("never runs more than the limit at once", async () => {
    const pool = createPool(2);
    let running = 0, peak = 0, done = 0;
    for (let i = 0; i < 6; i++) pool.add(async () => { running++; peak = Math.max(peak, running); await new Promise((r) => setTimeout(r, 10)); running--; done++; });
    await vi.waitFor(() => expect(done).toBe(6));
    expect(peak).toBe(2);
  });
  it("marks running jobs stale and drops queued ones after clear", async () => {
    const pool = createPool(1);
    const stale: boolean[] = []; let ran = 0;
    pool.add(async (g) => { await new Promise((r) => setTimeout(r, 20)); stale.push(pool.isStale(g)); });
    pool.add(async () => { ran++; });
    pool.clear();
    await new Promise((r) => setTimeout(r, 50));
    expect(stale).toEqual([true]);
    expect(ran).toBe(0);
  });
  it("spaces job starts by the gap and honors pause", async () => {
    const pool = createPool(1, { gapMs: 40 });
    const starts: number[] = [];
    const t0 = Date.now();
    for (let i = 0; i < 3; i++) pool.add(async () => { starts.push(Date.now() - t0); });
    await vi.waitFor(() => expect(starts).toHaveLength(3));
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(35);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(35);
    const p2 = createPool(2);
    const t1 = Date.now(); let started = 0;
    p2.pause(60);
    p2.add(async () => { started = Date.now() - t1; });
    await vi.waitFor(() => expect(started).toBeGreaterThan(0));
    expect(started).toBeGreaterThanOrEqual(55);
  });
  it("calls onRetry with growing delays and stops after the retry limit", async () => {
    const fn = vi.fn().mockResolvedValue("busy");
    const seen: number[] = [];
    const out = await withRetry(fn, (r) => r === "busy", { retries: 3, delayMs: (a) => 1 + a, onRetry: (_a, d) => seen.push(d) });
    expect(out).toBe("busy");
    expect(fn).toHaveBeenCalledTimes(4);
    expect(seen).toEqual([1, 2, 3]);
  });
  it("retries only while the result says so, once by default", async () => {
    const fn = vi.fn().mockResolvedValueOnce("busy").mockResolvedValue("ok");
    expect(await withRetry(fn, (r) => r === "busy", { delayMs: 1 })).toBe("ok");
    const always = vi.fn().mockResolvedValue("busy");
    expect(await withRetry(always, (r) => r === "busy", { delayMs: 1 })).toBe("busy");
    expect(always).toHaveBeenCalledTimes(2);
  });
});

describe("model cooldown", () => {
  it("skips a failed model until its cooldown ends", () => {
    let t = 0;
    const c = createCooldown(() => t);
    const models = ["a", "b", "c"];
    c.mark("a", 1000);
    expect(c.available(models)).toEqual(["b", "c"]);
    t = 999; expect(c.isCooling("a")).toBe(true);
    t = 1000; expect(c.available(models)).toEqual(["a", "b", "c"]);
  });
});
