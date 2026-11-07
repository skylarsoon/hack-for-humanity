import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AlertTriangle, Heart, Search, Receipt } from "lucide-react";
import { useNido } from "@/lib/nido-store";
import { AFFECTED, BASE_ASSISTED, BASE_SPENT_USD, PHASES, T, TOTAL_RAISED_USD, formatMoney, type Phase } from "@/lib/nido-data";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { publicHouseholdId } from "@/lib/public-households";
import { matchesPublicHousehold } from "@/lib/public-household-search";
import { CommunityPhotos } from "./CommunityPhotos";

const PijaoMap = lazy(() => import("./PijaoMap"));

const STATUS = {
  needs: { es: "Necesita ayuda", en: "Needs help", cls: "bg-destructive/10 text-destructive" },
  progress: { es: "En progreso", en: "In progress", cls: "bg-warning/25 text-warning-foreground" },
  delivered: { es: "Entregado", en: "Delivered", cls: "bg-success/15 text-primary" },
};

export function Dashboard() {
  const { lang, currency, phase, setPhase, households, expenses, extraSpent, extraAssisted } = useNido();
  const t = T[lang];
  const [q, setQ] = useState("");
  const hs = useMemo(() => households.filter((h) => (!phase || h.phase === phase) && matchesPublicHousehold(h, q)), [households, phase, q]);
  const ex = expenses.filter((e) => !phase || e.phase === phase);
  const spent = BASE_SPENT_USD + extraSpent;
  const spentPercent = (spent / TOTAL_RAISED_USD) * 100;
  const remaining = TOTAL_RAISED_USD - spent;

  const kpis = [
    { label: t.assisted, value: `${BASE_ASSISTED + extraAssisted} / ${AFFECTED}` },
    { label: t.crews, value: `4 ${lang === "es" ? "cuadrillas" : "crews"}` },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
      <CommunityPhotos lang={lang} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label={lang === "es" ? "Fondos de la comunidad" : "Community funding"} className="min-w-0 rounded-xl border border-primary/20 bg-card p-5 shadow-card sm:p-7 lg:col-span-2">
          <div className="flex items-center gap-2 text-primary">
            <Heart className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-semibold">{lang === "es" ? "Tu apoyo, en acción" : "Your support, in action"}</p>
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.raised}</p>
          <p className="mt-1 break-words font-display text-3xl font-semibold tabular-nums text-primary sm:text-5xl">{formatMoney(TOTAL_RAISED_USD, currency)} <span className="font-sans text-xs font-medium text-muted-foreground">{currency}</span></p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t pt-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Receipt className="h-4 w-4 shrink-0" aria-hidden="true" />{t.spent}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{formatMoney(spent, currency)}</p>
            </div>
            <p className="text-sm font-semibold text-primary">{spentPercent.toFixed(1)}% {lang === "es" ? "utilizado" : "used"}</p>
          </div>
          <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="mt-3 h-3 w-full overflow-hidden rounded-full" role="meter" aria-label={lang === "es" ? "Fondos utilizados" : "Funds used"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, spentPercent)}>
            <rect width="100" height="4" className="fill-muted" />
            <rect width={Math.min(100, Math.max(0, spentPercent))} height="4" className="fill-primary" />
          </svg>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{lang === "es" ? "Saldo restante para la recuperación" : "Remaining for recovery"}</span>
            <span className="font-semibold tabular-nums text-primary">{formatMoney(remaining, currency)}</span>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
        {kpis.map((k) => (
          <div key={k.label} className="min-w-0 rounded-xl bg-card p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-primary md:text-3xl">{k.value}</p>
          </div>
        ))}
        </div>
      </div>

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
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={lang === "es" ? "Buscar ID del hogar o vereda" : "Search household ID or vereda"} className="pl-9" />
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {hs.map((h) => (
                  <div key={h.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{publicHouseholdId(h.id)}</p>
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
                  <p className="mt-1 text-xs text-muted-foreground">→ {e.householdIds.map(publicHouseholdId).join(", ")}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
