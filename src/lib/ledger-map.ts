import { CATEGORIES, type ImpactCategory } from "./donor-impact";
import type { Expense, Phase } from "./nido-data";

export interface ExpenseRow {
  id: string; date: string; vendor: string; method: Expense["method"]; description: string;
  usd: number | string; phase: number; receipt: string; source: string; created_at: string;
  expense_households: { household_id: string }[];
  expense_items: { item: string; qty: number; category: string; usd: number | string }[];
}
export interface TotalRow { category: string; spent_usd: number | string; needed_usd: number | string }
export type CategoryTotals = Record<ImpactCategory, { spent: number; needed: number }>;
export interface Ledger { expenses: Expense[]; totals: CategoryTotals }

export function mapLedger(rows: ExpenseRow[], totalRows: TotalRow[]): Ledger {
  const totals = Object.fromEntries((Object.keys(CATEGORIES) as ImpactCategory[]).map((k) => [k, { spent: 0, needed: 0 }])) as CategoryTotals;
  for (const t of totalRows) if (t.category in totals) totals[t.category as ImpactCategory] = { spent: Number(t.spent_usd) || 0, needed: Number(t.needed_usd) || 0 };
  const expenses = rows.map((r): Expense => ({
    id: r.id, date: r.date, vendor: r.vendor, method: r.method, description: r.description,
    usd: Number(r.usd) || 0, phase: r.phase as Phase, householdIds: r.expense_households.map((h) => h.household_id),
    receipt: r.receipt, source: r.source as NonNullable<Expense["source"]>, createdAt: r.created_at,
    items: r.expense_items.map((i) => ({ item: i.item, qty: i.qty, category: i.category })),
  }));
  return { expenses, totals };
}
