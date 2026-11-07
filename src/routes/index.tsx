import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Code2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { NidoProvider, useNido } from "@/lib/nido-store";
import { T } from "@/lib/nido-data";
import { Dashboard } from "@/components/nido/Dashboard";
import { FieldCrew } from "@/components/nido/FieldCrew";
import { Workbench } from "@/components/nido/Workbench";
import { Builders } from "@/components/nido/Builders";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nido Abierto · Pijao Recovery & Open-Books Tracker" },
      { name: "description", content: "Open-books tracker for rebuilding Pijao, Quindío after the earthquake and wildfires — every peso, every household, visible." },
      { property: "og:title", content: "Nido Abierto · Pijao Recovery Tracker" },
      { property: "og:description", content: "Casa por casa, minga por minga, con las cuentas a la vista." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <NidoProvider>
      <App />
      <Toaster richColors position="bottom-right" />
    </NidoProvider>
  ),
});

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

function App() {
  const { lang, setLang, currency, setCurrency } = useNido();
  const [view, setView] = useState<"dash" | "field" | "build" | "ai">("dash");
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
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {(["dash", "field", "build", "ai"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium", view === v ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t[v]}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === "dash" && <Dashboard />}
        {view === "field" && <FieldCrew />}
        {view === "build" && <Builders />}
        {view === "ai" && <Workbench />}
      </main>
      <footer className="py-8 text-center text-xs text-muted-foreground">Espejo de Agua × Esto es Quindío · Alianza Nido · 1 USD = 3.230 COP</footer>
    </div>
  );
}
