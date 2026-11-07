import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Heart, MapPin, ShieldCheck } from "lucide-react";
import { useNido } from "@/lib/nido-store";
import { formatMoney } from "@/lib/nido-data";
import { CATEGORIES, impactByCategory, impactByVereda, regionProgress, REGIONS, whatItBuys, type ImpactCategory } from "@/lib/donor-impact";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { TransactionsTable } from "./TransactionsTable";
const RegionMap = lazy(() => import("./RegionMap"));
const GOFUNDME = "https://www.gofundme.com/f/support-pijao-families-after-earthquake-and-fires?cp_src=d";

export function DonorImpact() {
  const { lang, currency, expenses, households, categorySpent, categoryNeeded } = useNido();
  const es = lang === "es";
  const cats = categorySpent;
  const veredas = impactByVereda(expenses, households);
  const scale = Math.max(1, ...(Object.keys(cats) as ImpactCategory[]).map((k) => cats[k] + categoryNeeded[k]));
  const [amount, setAmount] = useState(50);
  const buys = whatItBuys(amount);

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-2xl font-semibold text-primary">{es ? "¿En qué se usó su donación?" : "What did your donation do?"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{es ? "Cada gasto tiene recibo verificado." : "Every expense has a verified receipt."}</p>
        <div className="mt-5 space-y-3">
          {(Object.keys(CATEGORIES) as ImpactCategory[]).map((k) => (
            <div key={k}>
              <div className="flex justify-between text-sm"><span>{CATEGORIES[k].icon} {CATEGORIES[k][lang]}</span><b>{formatMoney(cats[k], currency)}</b></div>
              <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${CATEGORIES[k][lang]}: ${formatMoney(cats[k], currency)} ${es ? "gastado" : "spent"}, ${formatMoney(categoryNeeded[k], currency)} ${es ? "aún necesario" : "still needed"}`}>
                <div className="h-3 bg-primary" style={{ width: `${(cats[k] / scale) * 100}%` }} />
                <div className="h-3 bg-primary/30" style={{ width: `${(categoryNeeded[k] / scale) * 100}%` }} />
              </div>
              {categoryNeeded[k] > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{es ? "Aún necesario" : "Still needed"}: {formatMoney(categoryNeeded[k], currency)}</p>}
            </div>
          ))}
        </div>
      </section>

      <TransactionsTable variant="public" />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl bg-card p-6 shadow-card">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="h-5 w-5 text-accent" />{es ? "¿A dónde va?" : "Where is it going?"}</h3>
          <div className="mt-4">
            <ClientOnly fallback={<div className="h-[380px] animate-pulse rounded-xl bg-muted" />}>
              <Suspense fallback={<div className="h-[380px] animate-pulse rounded-xl bg-muted" />}>
                <RegionMap spent={veredas} currency={currency} es={es} />
              </Suspense>
            </ClientOnly>
          </div>
          <div className="mt-4 space-y-3">
            {REGIONS.map((r) => {
              const got = veredas[r.vereda] ?? 0;
              const pct = regionProgress(got, r.needUsd);
              return (
                <div key={r.vereda}>
                  <div className="flex justify-between text-sm"><span>{r.vereda}</span><span><b>{formatMoney(got, currency)}</b> / {formatMoney(r.needUsd, currency)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
                  <p className="text-xs text-muted-foreground">{pct}% {es ? "de lo necesario para recuperarse (estimado)" : "of what's needed to fully recover (estimate)"}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />{es ? "Para proteger a las familias, mostramos solo totales por vereda — sin nombres, números de hogar ni ubicaciones exactas." : "To protect families, we only show totals per vereda — no names, household numbers or exact locations."}</p>
        </section>

        <section className="rounded-xl bg-card p-6 shadow-card">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><Heart className="h-5 w-5 text-accent" />{es ? "¿Qué logra su aporte?" : "What can your gift do?"}</h3>
          <div className="mt-4 flex gap-2">
            {[25, 50, 100, 250].map((a) => (
              <button key={a} onClick={() => setAmount(a)} className={cn("rounded-full border px-3 py-1 text-sm", amount === a ? "bg-primary text-primary-foreground" : "bg-card")}>{formatMoney(a, currency)}</button>
            ))}
          </div>
          <ul className="mt-4 space-y-1 text-sm">
            <li>🏠 {buys.roofSheets} {es ? "tejas de zinc" : "zinc roof sheets"}</li>
            <li>{es ? "o" : "or"} 💧 {buys.waterKits} {es ? "kits de agua e higiene" : "water & hygiene kits"}</li>
            <li>{es ? "o" : "or"} 💡 {buys.solarLamps} {es ? "lámparas solares" : "solar lamps"}</li>
          </ul>
          <Button asChild className="mt-5 w-full"><a href={GOFUNDME} target="_blank" rel="noreferrer"><Heart /> {es ? "Donar" : "Donate"}</a></Button>
        </section>
      </div>
    </div>
  );
}
