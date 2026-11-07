import { validApproval, supportedPhoto, type MingaDoc } from "./minga-documents";

export const MAX_BATCH = 30;
export const MAX_PHOTO_BYTES = 10_000_000;
export const READY_MATCH_SCORE = 0.8;

export type Stage = "queued" | "analyzing" | "done" | "error" | "saving" | "approved";

export interface QueueItem {
  id: string;
  fileName: string;
  previewUrl: string | null;
  stage: Stage;
  doc: MingaDoc | null;
  error: string | null;
  /** Transient status shown while a row waits, e.g. "Gemini is busy. Retrying in 10s…". */
  note: string | null;
  receiptId: string;
  /** The reviewer ticked "I checked this" for the row. */
  acknowledged: boolean;
  /** False for sample documents, which never reach the database. */
  real: boolean;
}

/** Why a classified row needs a human look before it can be bulk-approved. Empty means Ready. */
export function attentionReasons(doc: MingaDoc, householdIds: string[]): string[] {
  const reasons: string[] = [];
  if (!householdIds.includes(doc.household)) reasons.push("Household not matched");
  else if (doc.entity_resolution && doc.entity_resolution.similarity_score < READY_MATCH_SCORE) reasons.push(`Low household match (${Math.round(doc.entity_resolution.similarity_score * 100)}%)`);
  if (doc.low_confidence_warnings.length) reasons.push("Handwriting doubts");
  if (doc.cop_estimated) reasons.push("Total is an estimate");
  else if (doc.doc_type !== "CENSUS_FORM" && doc.cop <= 0) reasons.push("No total");
  if (doc.line_items.some((l) => !l.item.trim())) reasons.push("Missing item name");
  return reasons;
}

export type RowState = "queued" | "reading" | "ready" | "attention" | "error" | "saving" | "saved";

export function rowState(item: QueueItem, householdIds: string[]): RowState {
  switch (item.stage) {
    case "queued": return "queued";
    case "analyzing": return "reading";
    case "error": return "error";
    case "saving": return "saving";
    case "approved": return "saved";
    default: return item.doc && attentionReasons(item.doc, householdIds).length === 0 ? "ready" : "attention";
  }
}

/** Valid fields, and either nothing flagged or the reviewer ticked the row. */
export function isApprovable(item: QueueItem, householdIds: string[]): boolean {
  if (item.stage !== "done" || !item.doc || !validApproval(item.doc, householdIds)) return false;
  return item.acknowledged || attentionReasons(item.doc, householdIds).length === 0;
}

export const bulkTargets = (items: QueueItem[], householdIds: string[]) => items.filter((i) => isApprovable(i, householdIds));

export interface FileLike { name: string; size: number; type: string; lastModified: number }
export const fileKey = (f: FileLike) => `${f.name}|${f.size}|${f.lastModified}`;

/** Splits dropped files into accepted and rejected, honoring type, size, duplicates and the per-batch cap. */
export function planBatch<F extends FileLike>(files: F[], existingKeys: Set<string>, existingCount: number) {
  const accepted: F[] = [];
  const rejected: { name: string; reason: string }[] = [];
  const seen = new Set(existingKeys);
  for (const f of files) {
    if (!supportedPhoto(f.type)) rejected.push({ name: f.name, reason: "not a PNG or JPG photo" });
    else if (f.size > MAX_PHOTO_BYTES) rejected.push({ name: f.name, reason: "larger than 10 MB" });
    else if (seen.has(fileKey(f))) rejected.push({ name: f.name, reason: "already in the queue" });
    else if (existingCount + accepted.length >= MAX_BATCH) rejected.push({ name: f.name, reason: `queue is limited to ${MAX_BATCH} photos` });
    else { accepted.push(f); seen.add(fileKey(f)); }
  }
  return { accepted, rejected };
}

/** Analysis errors worth one automatic retry: overloaded or timed out. */
export const isBusyError = (message: string | null | undefined) => /busy|too long/i.test(message ?? "");
