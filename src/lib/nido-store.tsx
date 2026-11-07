import { createContext, useContext, useReducer, useState, type ReactNode } from "react";
import { type Currency, type Lang, type Phase } from "./nido-data";
import { deliveryReducer, initialDeliveryState } from "./nido-delivery";

export interface QueuedUpdate { id: string; householdId: string; items: string[]; photo: boolean; at: string }

function useNidoState() {
  const [lang, setLang] = useState<Lang>("es");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [{ households, expenses, extraSpent, extraAssisted }, dispatchDelivery] = useReducer(deliveryReducer, undefined, initialDeliveryState);
  const [fieldAddedIds, setFieldAddedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueuedUpdate[]>(() => [
    { id: "q1", householdId: "fam_03", items: ["Tejas de Zinc"], photo: true, at: "07:42" },
    { id: "q2", householdId: "fam_05", items: ["Lámpara Solar"], photo: false, at: "08:15" },
  ]);

  /** Mark household delivered with items and record an expense. */
  function deliver(householdId: string, items: string[], usd: number, vendor: string, receipt: string) {
    dispatchDelivery({ householdId, items, usd, vendor, receipt, id: `exp_${crypto.randomUUID()}`, date: new Date().toISOString().slice(0, 10) });
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
