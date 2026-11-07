import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Code2, Heart, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNido } from "@/lib/nido-store";
import { T } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EMBED = `<iframe src="https://nido-abierto.lovable.app/?embed=1" width="100%" height="900" style="border:0;border-radius:12px" title="Nido Abierto · Pijao" loading="lazy"></iframe>`;

function Toggle<V extends string>({ value, options, onChange }: { value: V; options: V[]; onChange: (v: V) => void }) {
  return (
    <div className="flex rounded-full border bg-card p-0.5 text-xs font-semibold">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={cn("rounded-full px-3 py-1", value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{o.toUpperCase()}</button>
      ))}
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { lang, setLang, currency, setCurrency } = useNido();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isStaff = pathname.startsWith("/staff/");
  const t = T[lang];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-[1000] border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-semibold text-primary">Nido Abierto · Pijao</h1>
            <p className="max-w-xl text-xs text-muted-foreground">Reconstruyendo el campo de Pijao: casa por casa, minga por minga, con las cuentas a la vista</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"><ShieldCheck className="h-3.5 w-3.5" />92% Direct to Field · &lt;10% Admin Cap</span>
          <Toggle value={lang} options={["es", "en"]} onChange={setLang} />
          <Toggle value={currency} options={["COP", "USD"]} onChange={setCurrency} />
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Code2 /> {t.embed}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Embed on espejodeagua.org/emergencia.html</DialogTitle></DialogHeader>
              <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{EMBED}</pre>
              <Button onClick={() => { navigator.clipboard.writeText(EMBED); toast.success("Snippet copied"); }}>Copy snippet</Button>
            </DialogContent>
          </Dialog>
          {!isStaff && <Button asChild variant="ghost" size="sm"><Link to="/staff/field">{lang === "es" ? "Equipo" : "Staff"}</Link></Button>}
          <Button asChild className="ml-auto shrink-0">
            <a href="https://www.gofundme.com/f/support-pijao-families-after-earthquake-and-fires?cp_src=d" target="_blank" rel="noopener noreferrer">
              <Heart aria-hidden="true" /> {lang === "es" ? "Donar ahora" : "Donate now"}
            </a>
          </Button>
        </div>
        {isStaff && (
          <nav aria-label="Staff pages" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-3">
            <Button asChild variant="ghost"><Link to="/">{lang === "es" ? "Tablero público" : "Donor dashboard"}</Link></Button>
            <Button asChild variant={pathname === "/staff/field" ? "secondary" : "ghost"}><Link to="/staff/field">{t.field}</Link></Button>
            <Button asChild variant={pathname === "/staff/coordinator" ? "secondary" : "ghost"}><Link to="/staff/coordinator">{t.ai}</Link></Button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
      <footer className="py-8 text-center text-xs text-muted-foreground">Espejo de Agua × Esto es Quindío · Alianza Nido · 1 USD = 3.230 COP</footer>
    </div>
  );
}
