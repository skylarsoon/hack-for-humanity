import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AlertTriangle, Search, Receipt } from "lucide-react";
import { useNido } from "@/lib/nido-store";
import { AFFECTED, BASE_ASSISTED, BASE_SPENT_USD, PHASES, T, TOTAL_RAISED_USD, formatMoney, type Phase } from "@/lib/nido-data";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const PijaoMap = lazy(() => import("./PijaoMap"));

const STATUS = {
  needs: { es: "Necesita ayuda", en: "Needs help", cls: "bg-destructive/10 text-destructive" },
  progress: { es: "En progreso", en: "In progress", cls: "bg-warning/25 text-warning-foreground" },
  delivered: { es: "Entregado", en: "Delivered", cls: "bg-success/15 text-primary" },
};

export function Dashboard() {
  const { lang, currency, phase, setPhase, households, expenses, extraSpent, extraAssisted, queue } = useNido();
  const t = T[lang];
  const [q, setQ] = useState("");
  const hs = useMemo(() => households.filter((h) => (!phase || h.phase === phase) && (h.name + h.vereda).toLowerCase().includes(q.toLowerCase())), [households, phase, q]);
  const ex = expenses.filter((e) => !phase || e.phase === phase);
  const name = (id: string) => households.find((h) => h.id === id)?.name ?? id;

  const kpis = [
    { label: t.raised, value: formatMoney(TOTAL_RAISED_USD, currency) },
    { label: t.spent, value: formatMoney(BASE_SPENT_USD + extraSpent, currency) },
    { label: t.assisted, value: `${BASE_ASSISTED + extraAssisted} / ${AFFECTED}` },
    { label: t.crews, value: `4 · ${queue.length ? "+" : ""}${18 + queue.length} ${lang === "es" ? "voluntarios" : "volunteers"}` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl bg-card p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-primary md:text-3xl">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <button onClick={() => setPhase(null)} className={cn("rounded-xl border p-4 text-left transition", !phase ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}>
          <p className="font-display text-lg font-semibold">{t.all}</p>
          <p className="text-xs opacity-80">{lang === "es" ? "Las 3 fases" : "All 3 phases"}</p>
        </button>
        {([1, 2, 3] as Phase[]).map((p) => (
          <button key={p} onClick={() => setPhase(phase === p ? null : p)} className={cn("rounded-xl border p-4 text-left transition", phase === p ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:border-accent")}>
            <p className="text-xs font-semibold uppercase opacity-70">{lang === "es" ? "Fase" : "Phase"} {p}</p>
            <p className="font-display text-lg font-semibold">{PHASES[p][lang]}</p>
            <p className="text-xs opacity-80">{lang === "es" ? PHASES[p].descEs : PHASES[p].descEn}</p>
          </button>
        ))}
      </div>

      <div className="hazard-pulse flex items-start gap-3 rounded-xl border-2 border-accent bg-accent/10 p-4">
        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
        <div>
          <p className="font-semibold text-accent">El Filo Ridge Trail → Resguardo Ibanacuara</p>
          <p className="text-sm">SOIL & LANDSLIDE RISK: Construction and heavy material transport paused; retention engineering needed.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl bg-card p-2 shadow-card lg:col-span-3">
          <ClientOnly fallback={<div className="h-[440px] animate-pulse rounded-xl bg-muted" />}>
            <Suspense fallback={<div className="h-[440px] animate-pulse rounded-xl bg-muted" />}>
              <PijaoMap households={hs} currency={currency} />
            </Suspense>
          </ClientOnly>
          <div className="flex gap-4 px-2 py-2 text-xs text-muted-foreground">
            <span>🔴 {STATUS.needs[lang]}</span><span>🟡 {STATUS.progress[lang]}</span><span>🟢 {STATUS.delivered[lang]}</span><span>🟠 {lang === "es" ? "Riesgo" : "Hazard"}</span>
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 shadow-card lg:col-span-2">
          <Tabs defaultValue="hh">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hh">{t.households}</TabsTrigger>
              <TabsTrigger value="ledger">{t.ledger}</TabsTrigger>
            </TabsList>
            <TabsContent value="hh" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="pl-9" />
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {hs.map((h) => (
                  <div key={h.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{h.name}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS[h.status].cls)}>{STATUS[h.status][lang]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.vereda} · {h.community} · {h.members} pers. · F{h.phase} {PHASES[h.phase][lang]}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.needs.map((n) => <span key={n} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">− {n}</span>)}
                      {h.delivered.map((n) => <span key={n} className="rounded bg-success/15 px-1.5 py-0.5 text-[11px] text-primary">✔ {n}</span>)}
                    </div>
                  </div>
                ))}
                {!hs.length && <p className="py-6 text-center text-sm text-muted-foreground">—</p>}
              </div>
            </TabsContent>
            <TabsContent value="ledger" className="max-h-[470px] space-y-2 overflow-y-auto pr-1">
              {ex.map((e) => (
                <div key={e.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1 font-semibold"><Receipt className="h-4 w-4 text-accent" />{e.vendor}</p>
                      <p className="text-xs text-muted-foreground">{e.date} · {e.method} · {e.receipt}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatMoney(e.usd, currency)}</p>
                      <p className="text-[11px] text-muted-foreground">{formatMoney(e.usd, currency === "USD" ? "COP" : "USD")}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-sm">{e.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">→ {e.householdIds.map(name).join(", ")}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
