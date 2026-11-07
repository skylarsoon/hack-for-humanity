import { createContext, useContext, useState, type ReactNode } from "react";
import { seedExpenses, seedHouseholds, type Currency, type Expense, type Household, type Lang, type Phase } from "./nido-data";

export interface QueuedUpdate { id: string; householdId: string; items: string[]; photo: boolean; at: string }

function useNidoState() {
  const [lang, setLang] = useState<Lang>("es");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [households, setHouseholds] = useState<Household[]>(seedHouseholds);
  const [expenses, setExpenses] = useState<Expense[]>(seedExpenses);
  const [extraSpent, setExtraSpent] = useState(0);
  const [extraAssisted, setExtraAssisted] = useState(0);
  const [fieldAddedIds, setFieldAddedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueuedUpdate[]>(() => [
    { id: "q1", householdId: "fam_03", items: ["Tejas de Zinc"], photo: true, at: "07:42" },
    { id: "q2", householdId: "fam_05", items: ["Lámpara Solar"], photo: false, at: "08:15" },
  ]);

  /** Mark household delivered with items and record an expense. */
  function deliver(householdId: string, items: string[], usd: number, vendor: string, receipt: string) {
    let becameDelivered = false;
    setHouseholds((hs) => hs.map((h) => {
      if (h.id !== householdId) return h;
      if (h.status !== "delivered") becameDelivered = true;
      return { ...h, status: "delivered", delivered: Array.from(new Set([...h.delivered, ...items])), needs: h.needs.filter((n) => !items.includes(n)), costUsd: h.costUsd + usd };
    }));
    if (becameDelivered) setExtraAssisted((n) => n + 1);
    if (usd > 0) {
      const h = households.find((x) => x.id === householdId);
      setExpenses((es) => [{ id: `exp_${Date.now()}`, date: new Date().toISOString().slice(0, 10), vendor, method: "Efectivo + Acta", description: items.join(", "), usd, phase: h?.phase ?? 1, householdIds: [householdId], receipt }, ...es]);
      setExtraSpent((s) => s + usd);
    }
  }

  return { lang, setLang, currency, setCurrency, phase, setPhase, households, expenses, extraSpent, extraAssisted, queue, setQueue, deliver, fieldAddedIds, setFieldAddedIds };
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
