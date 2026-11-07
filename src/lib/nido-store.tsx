import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { seedHouseholds, type Currency, type Lang, type Phase } from "./nido-data";
import { CATEGORIES, impactByCategory, type ImpactCategory } from "./donor-impact";
import { fetchLedger, subscribeLedger } from "./ledger-client";
import type { Ledger } from "./ledger-map";
import { deliveryReducer, initialDeliveryState } from "./nido-delivery";

const seedStatus = (id: string) => seedHouseholds().find((h) => h.id === id)?.status;

export interface QueuedUpdate { id: string; householdId: string; items: string[]; photo: boolean; at: string }

function useNidoState() {
  const [lang, setLang] = useState<Lang>("es");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [{ households: sessionHouseholds, expenses: sessionExpenses, extraSpent: sessionSpent, extraAssisted: sessionAssisted }, dispatchDelivery] = useReducer(deliveryReducer, undefined, initialDeliveryState);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const refreshLedger = useCallback(() => { fetchLedger().then(setLedger).catch((e) => console.error("Ledger load failed; showing demo data", e)); }, []);
  useEffect(() => { refreshLedger(); return subscribeLedger(refreshLedger); }, [refreshLedger]);

  // Database rows win; session-only entries (field crew, sample approvals) are kept unless the database already has that receipt.
  const { households, expenses, extraSpent, extraAssisted, categorySpent, categoryNeeded } = useMemo(() => {
    const db = ledger?.expenses ?? [];
    const dbReceipts = new Set(db.map((e) => e.receipt));
    const sessionOnly = sessionExpenses.filter((e) => !dbReceipts.has(e.receipt));
    const added = db.filter((e) => e.source !== "seed");
    // Real approvals update the household cards too: mark delivered and move the items from needs to delivered.
    const deliveredBy = new Map<string, Set<string>>();
    for (const e of added) for (const id of e.householdIds) { const set = deliveredBy.get(id) ?? new Set<string>(); (e.items ?? []).forEach((i) => set.add(i.item)); deliveredBy.set(id, set); }
    const households = sessionHouseholds.map((h) => {
      const items = deliveredBy.get(h.id);
      return items ? { ...h, status: "delivered" as const, delivered: Array.from(new Set([...h.delivered, ...items])), needs: h.needs.filter((n) => !items.has(n)) } : h;
    });
    const newlyAssisted = Array.from(deliveredBy.keys()).filter((id) => seedStatus(id) !== "delivered").length;
    const spent = Object.fromEntries((Object.keys(CATEGORIES) as ImpactCategory[]).map((k) => [k, 0])) as Record<ImpactCategory, number>;
    const sessionImpact = impactByCategory(sessionOnly);
    const needed = { ...spent };
    for (const k of Object.keys(spent) as ImpactCategory[]) {
      spent[k] = (ledger?.totals[k].spent ?? 0) + (ledger ? sessionImpact[k] : 0);
      needed[k] = ledger?.totals[k].needed ?? 0;
    }
    return {
      households,
      expenses: ledger ? [...db, ...sessionOnly] : sessionExpenses,
      extraSpent: sessionSpent + added.reduce((a, e) => a + e.usd, 0),
      extraAssisted: sessionAssisted + newlyAssisted,
      categorySpent: ledger ? spent : impactByCategory(sessionExpenses),
      categoryNeeded: needed,
    };
  }, [ledger, sessionHouseholds, sessionExpenses, sessionSpent, sessionAssisted]);
  const [fieldAddedIds, setFieldAddedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueuedUpdate[]>(() => [
    { id: "q1", householdId: "HH_03", items: ["Tejas de Zinc"], photo: true, at: "07:42" },
    { id: "q2", householdId: "HH_05", items: ["Lámpara Solar"], photo: false, at: "08:15" },
  ]);

  /** Mark household delivered with items and record an expense. */
  function deliver(householdId: string, items: string[], usd: number, vendor: string, receipt: string) {
    dispatchDelivery({ householdId, items, usd, vendor, receipt, id: `exp_${crypto.randomUUID()}`, date: new Date().toISOString().slice(0, 10) });
  }

  return { categorySpent, categoryNeeded, ledgerLoaded: ledger !== null, refreshLedger, lang, setLang, currency, setCurrency, phase, setPhase, households, expenses, extraSpent, extraAssisted, queue, setQueue, deliver, fieldAddedIds, setFieldAddedIds };
}

const Ctx = createContext<ReturnType<typeof useNidoState> | null>(null);
export function NidoProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useNidoState()}>{children}</Ctx.Provider>;
}
export function useNido() {
  const v = useContext(Ctx);
  if (!v) throw new Error("NidoProvider missing");
  return v;
}
