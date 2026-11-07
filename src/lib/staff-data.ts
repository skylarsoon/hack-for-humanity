import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type HouseholdRow = T["households"]["Row"];
export type NeedRow = T["household_needs"]["Row"];
export type DocumentRow = T["documents"]["Row"];
export type ExpenseRecord = T["expenses"]["Row"] & {
  expense_households: { household_id: string }[];
  expense_items: { item: string; qty: number; category: string; usd: number }[];
};
export interface StaffData { households: HouseholdRow[]; needs: NeedRow[]; expenses: ExpenseRecord[]; documents: DocumentRow[] }

/** Everything the coordinator dashboard shows. Needs a signed-in session: most of these tables are closed to anonymous visitors. */
export async function fetchStaffData(): Promise<StaffData> {
  const { supabase } = await import("@/integrations/supabase/client");
  const [households, needs, expenses, documents] = await Promise.all([
    supabase.from("households").select("*").order("id"),
    supabase.from("household_needs").select("*").order("created_at", { ascending: false }),
    supabase.from("expenses").select("*, expense_households(household_id), expense_items(item,qty,category,usd)").order("created_at", { ascending: false }),
    supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  for (const r of [households, needs, expenses, documents]) if (r.error) throw r.error;
  return { households: households.data ?? [], needs: needs.data ?? [], expenses: (expenses.data ?? []) as unknown as ExpenseRecord[], documents: documents.data ?? [] };
}

export function summarize(d: StaffData) {
  const open = d.needs.filter((n) => n.status === "open");
  return {
    households: d.households.length,
    needsHelp: d.households.filter((h) => h.status === "needs").length,
    delivered: d.households.filter((h) => h.status === "delivered").length,
    spentUsd: d.expenses.reduce((a, e) => a + Number(e.usd), 0),
    newSpentUsd: d.expenses.filter((e) => e.source !== "seed").reduce((a, e) => a + Number(e.usd), 0),
    openNeedCount: open.length,
    openNeedsUsd: open.reduce((a, n) => a + n.qty * Number(n.unit_usd), 0),
    documents: d.documents.length,
  };
}

/** Where a stored document came from: the field phone writes extracted.source = "field"; everything else is the Workbench. */
export function documentSource(doc: Pick<DocumentRow, "extracted">): "field" | "workbench" {
  const e = doc.extracted as { source?: unknown } | null;
  return e && typeof e === "object" && e.source === "field" ? "field" : "workbench";
}

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  return [columns.map((c) => cell(c.label)).join(","), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
