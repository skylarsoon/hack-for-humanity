import { CATEGORIES, categorize, type ImpactCategory } from "./donor-impact";
import type { Expense } from "./nido-data";

export type TransactionKind = "verified" | "demo" | "session";

export interface Transaction {
  id: string;
  date: string;
  createdAt: string | null;
  category: ImpactCategory;
  items: string;
  usd: number;
  phase: Expense["phase"];
  kind: TransactionKind;
  /** Staff-only detail; the public table never renders these. */
  vendor: string;
  receipt: string;
  householdIds: string[];
  source: string;
}

/** The category carrying the most money, so a mixed receipt is labelled by what it mostly bought. */
function primaryCategory(e: Expense): ImpactCategory {
  const totals = new Map<string, number>();
  for (const i of e.items ?? []) totals.set(i.category, (totals.get(i.category) ?? 0) + i.qty);
  const top = [...totals.entries()].filter(([c]) => c in CATEGORIES).sort((a, b) => b[1] - a[1])[0];
  return (top?.[0] as ImpactCategory | undefined) ?? categorize(e.description);
}

/** Database rows are verified records; entries with no database source exist only in this browser session. */
function kindOf(e: Expense): TransactionKind {
  if (e.source) return "verified";
  return e.receipt.startsWith("SAMPLE-") ? "demo" : "session";
}

const itemsLabel = (e: Expense) => e.items?.length ? e.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.item}` : i.item)).join(", ") : e.description;

export function latestTransactions(expenses: Expense[], limit = 10): Transaction[] {
  const stamp = (e: Expense) => e.createdAt ?? `${e.date}T00:00:00Z`;
  return [...expenses]
    .sort((a, b) => stamp(b).localeCompare(stamp(a)))
    .slice(0, limit)
    .map((e) => ({
      id: e.id, date: e.date, createdAt: e.createdAt ?? null, category: primaryCategory(e), items: itemsLabel(e), usd: e.usd,
      phase: e.phase, kind: kindOf(e), vendor: e.vendor, receipt: e.receipt, householdIds: e.householdIds, source: e.source ?? "session",
    }));
}
