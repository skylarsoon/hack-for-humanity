import { SUPPLIES, USD_TO_COP } from "./nido-data";
import type { ImpactCategory } from "./donor-impact";

// Browser-safe helpers that turn a reviewed document into database rows.
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Reference unit price (USD) for an item name, or 0 when the item is not in SUPPLIES. */
export function unitUsd(item: string) {
  const n = norm(item);
  if (!n) return 0;
  const hit = SUPPLIES.find((s) => { const k = norm(s.key); return k === n || n.includes(k) || k.includes(n); });
  return hit?.usd ?? 0;
}

/** Total in COP implied by reference prices; used only to prefill a document that printed no total. */
export const estimateCop = (items: { item: string; qty: number }[]) => items.reduce((sum, l) => sum + Math.max(1, l.qty) * unitUsd(l.item) * USD_TO_COP, 0);

export const copToUsd = (cop: number) => Math.round((cop / USD_TO_COP) * 100) / 100;

/** Splits totalUsd across lines (by qty x reference price, or qty alone when any line is unpriced) so the parts sum exactly. */
export function allocateUsd(items: { item: string; qty: number }[], totalUsd: number): number[] {
  if (!items.length) return [];
  const cents = Math.round(totalUsd * 100);
  const priced = items.every((i) => unitUsd(i.item) > 0);
  const weights = items.map((i) => Math.max(1, i.qty) * (priced ? unitUsd(i.item) : 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (cents * w) / sum);
  const base = raw.map(Math.floor);
  let left = cents - base.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, f: r - base[i]! })).sort((a, b) => b.f - a.f).forEach(({ i }) => { if (left-- > 0) base[i]! += 1; });
  return base.map((c) => c / 100);
}

export interface ReviewedItem { item: string; qty: number; category: ImpactCategory }

export function expenseItemsPayload(items: ReviewedItem[], totalUsd: number) {
  const usd = allocateUsd(items, totalUsd);
  return items.map((l, i) => ({ item: l.item.trim(), qty: l.qty, category: l.category, usd: usd[i] ?? 0 }));
}

export function censusItemsPayload(items: ReviewedItem[]) {
  return items.map((l) => ({ item: l.item.trim(), qty: l.qty, category: l.category, unit_usd: unitUsd(l.item) }));
}

/** Census lines with no known price count as $0 in the needs budget; the reviewer should be told. */
export const unpricedItems = (items: ReviewedItem[]) => items.filter((l) => unitUsd(l.item) === 0).map((l) => l.item);
