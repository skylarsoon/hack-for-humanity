import { categorize } from "./donor-impact";
import { SUPPLIES } from "./nido-data";

/** The field app's hazard tile is an alert about the household, not a supply need. */
export const HAZARD_ITEM = "Alerta Derrumbe";

/** Tapped supply tiles become needs, priced at the reference unit cost. Hazard alerts and duplicates are dropped. */
export function fieldNeedItems(items: string[]) {
  return Array.from(new Set(items))
    .filter((item) => item !== HAZARD_ITEM)
    .map((item) => ({ item, qty: 1, category: categorize(item), unit_usd: SUPPLIES.find((s) => s.key === item)?.usd ?? 0 }));
}
