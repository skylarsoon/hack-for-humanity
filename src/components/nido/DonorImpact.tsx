import { useState } from "react";
import { Heart, MapPin, ShieldCheck } from "lucide-react";
import { useNido } from "@/lib/nido-store";
import { formatMoney } from "@/lib/nido-data";
import { CATEGORIES, impactByCategory, impactByVereda, whatItBuys, type ImpactCategory } from "@/lib/donor-impact";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GOFUNDME = "https://www.gofundme.com/f/support-pijao-families-after-earthquake-and-fires?cp_src=d";

export function DonorImpact() {
  const { lang, currency, expenses, households } = useNido();
  const es = lang === "es";
  const cats = impactByCategory(expenses);
  const veredas = impactByVereda(expenses, households);
  const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
  const maxV = Math.max(1, ...Object.values(veredas));
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
              <div className="mt-1 h-3 rounded-full bg-muted"><div className="h-3 rounded-full bg-primary" style={{ width: `${(cats[k] / total) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl bg-card p-6 shadow-card">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="h-5 w-5 text-accent" />{es ? "¿A dónde va?" : "Where is it going?"}</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(veredas).sort((a, b) => b[1] - a[1]).map(([v, usd]) => (
              <div key={v}>
                <div className="flex justify-between text-sm"><span>{v}</span><b>{formatMoney(usd, currency)}</b></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-accent" style={{ width: `${(usd / maxV) * 100}%` }} /></div>
              </div>
            ))}
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
