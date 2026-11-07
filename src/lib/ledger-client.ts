import { mapLedger, type ExpenseRow, type Ledger, type TotalRow } from "./ledger-map";

// Anonymous reads only: expenses, expense_items, expense_households and category_totals are public by design.
export async function fetchLedger(): Promise<Ledger> {
  const { supabase } = await import("@/integrations/supabase/client");
  const [expenses, totals] = await Promise.all([
    supabase.from("expenses").select("id,date,vendor,method,description,usd,phase,receipt,source,expense_households(household_id),expense_items(item,qty,category,usd)").order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("category_totals").select("category,spent_usd,needed_usd"),
  ]);
  if (expenses.error) throw expenses.error;
  if (totals.error) throw totals.error;
  return mapLedger(expenses.data as unknown as ExpenseRow[], (totals.data ?? []) as TotalRow[]);
}

/** Calls onChange (debounced) whenever ledger tables change. Returns an unsubscribe function. */
export function subscribeLedger(onChange: () => void): () => void {
  let stop = () => {};
  let cancelled = false;
  void import("@/integrations/supabase/client").then(({ supabase }) => {
    if (cancelled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ping = () => { clearTimeout(timer); timer = setTimeout(onChange, 300); };
    const channel = supabase.channel("ledger-changes");
    for (const table of ["expenses", "expense_items", "household_needs"]) channel.on("postgres_changes", { event: "*", schema: "public", table }, ping);
    channel.subscribe();
    stop = () => { clearTimeout(timer); void supabase.removeChannel(channel); };
  });
  return () => { cancelled = true; stop(); };
}
