import type { Expense, Household } from "./nido-data";

// Browser-safe donor summaries. Privacy: totals are grouped by category and vereda only —
// never household names, IDs, or coordinates.
export type ImpactCategory = "roof" | "water" | "energy" | "rebuild" | "heal";

export const CATEGORIES: Record<ImpactCategory, { es: string; en: string; icon: string }> = {
  roof: { es: "Techos", en: "Roofing", icon: "🏠" },
  water: { es: "Agua e higiene", en: "Water & hygiene", icon: "💧" },
  energy: { es: "Energía solar", en: "Solar power", icon: "💡" },
  rebuild: { es: "Reconstrucción", en: "Rebuilding", icon: "🪵" },
  heal: { es: "Huertas y sanación", en: "Gardens & healing", icon: "🌱" },
};

export function categorize(description: string): ImpactCategory {
  const d = description.toLowerCase();
  if (/teja|techo|zinc/.test(d)) return "roof";
  if (/agua|higiene/.test(d)) return "water";
  if (/solar|lámpara|lampara/.test(d)) return "energy";
  if (/guadua|madera|bahareque|cemento/.test(d)) return "rebuild";
  return "heal";
}

export function impactByCategory(expenses: Expense[]) {
  const totals = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, 0])) as Record<ImpactCategory, number>;
  for (const e of expenses) totals[categorize(e.description)] += e.usd;
  return totals;
}

/** Spending split evenly across the veredas of the households each expense served. */
export function impactByVereda(expenses: Expense[], households: Household[]) {
  const out: Record<string, number> = {};
  for (const e of expenses) {
    const veredas = e.householdIds.map((id) => households.find((h) => h.id === id)?.vereda).filter((v): v is Household["vereda"] => Boolean(v));
    if (!veredas.length) continue;
    for (const v of veredas) out[v] = (out[v] ?? 0) + e.usd / veredas.length;
  }
  return out;
}

/** What a donation amount could buy, from per-unit supply costs. */
export function whatItBuys(usd: number) {
  return { roofSheets: Math.floor(usd / 26), waterKits: Math.floor(usd / 26), solarLamps: Math.floor(usd / 35) };
}
