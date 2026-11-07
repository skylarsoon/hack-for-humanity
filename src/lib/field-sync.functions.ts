import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { HAZARD_ITEM, fieldNeedItems } from "./field-sync";

const Update = z.object({
  id: z.string().uuid(),
  householdId: z.string().min(1).max(40),
  items: z.array(z.string().trim().min(1).max(80)).max(20),
  photo: z.boolean(),
  at: z.string().max(10),
  survey: z.record(z.string().max(200)).refine((s) => Object.keys(s).length <= 80).optional(),
});
const Input = z.object({ updates: z.array(Update).min(1).max(50) });

export type FieldSyncResult = { id: string; ok: boolean; message: string }[];

/**
 * Saves queued field-crew updates. Each one becomes a `documents` row (keeping the survey answers) plus open needs via
 * approve_census. The document id is the queue entry's id, so syncing the same entry twice never double-counts.
 */
export const syncFieldUpdates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<FieldSyncResult> => {
    const { supabase } = context;
    const { data: known } = await supabase.from("public_households").select("id");
    const knownIds = new Set((known ?? []).map((h) => h.id));
    const results: FieldSyncResult = [];

    for (const u of data.updates) {
      if (!knownIds.has(u.householdId)) { results.push({ id: u.id, ok: false, message: `${u.householdId} is not registered yet.` }); continue; }
      const needs = fieldNeedItems(u.items);
      const hazard = u.items.includes(HAZARD_ITEM);

      const { error: docError } = await supabase.from("documents").insert({
        id: u.id, doc_type: "CENSUS_FORM",
        extracted: { source: "field", household: u.householdId, at: u.at, photo: u.photo, hazard, items: u.items, survey: u.survey ?? {} } as Json,
      });
      if (docError) {
        if (docError.code !== "23505") { console.error("Field document insert failed", docError.message); results.push({ id: u.id, ok: false, message: "Could not save." }); continue; }
        // Already inserted by an earlier attempt: only finish the needs if that attempt never wrote them.
        const { count } = await supabase.from("household_needs").select("id", { count: "exact", head: true }).eq("document_id", u.id);
        if ((count ?? 0) > 0 || !needs.length) { results.push({ id: u.id, ok: true, message: "Already synced." }); continue; }
      }
      if (!needs.length) { results.push({ id: u.id, ok: true, message: hazard ? "Hazard alert saved." : "Saved." }); continue; }
      const { error } = await supabase.rpc("approve_census", { p_household_id: u.householdId, p_document_id: u.id, p_items: needs as unknown as Json });
      results.push(error ? { id: u.id, ok: false, message: error.message } : { id: u.id, ok: true, message: `${needs.length} need${needs.length === 1 ? "" : "s"} added.` });
    }
    return results;
  });
