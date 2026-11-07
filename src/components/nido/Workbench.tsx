import { useEffect, useState } from "react";
import { Check, Copy, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNido } from "@/lib/nido-store";
import { AFFECTED, BASE_ASSISTED, BASE_SPENT_USD, TOTAL_RAISED_USD, USD_TO_COP, formatMoney } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Doc = { title: string; preview: string; household: string; item: string; qty: number; cop: number; vendor: string; low?: string };

const SAMPLES: Record<string, Doc> = {
  census: { title: "Paper Census Form", preview: "CENSO — Vereda La Maizena\nJefe de hogar: Gómez, Arnulfo\nPersonas: 5\nNecesita: tejas de zinc (1? 7?)", household: "fam_01", item: "Tejas de Zinc", qty: 12, cop: 1007760, vendor: "Censo comunitario", low: "Handwriting check: Quantity looks like 12 or 17 Tejas de Zinc" },
  acta: { title: "Signed Acta Receipt", preview: "ACTA DE ENTREGA\nResguardo Ibanacuara\nRecibe: Fam. Queragama\n6 tejas, 1 kit agua\nFirma: ✍", household: "fam_03", item: "Tejas de Zinc", qty: 6, cop: 587860, vendor: "Acta Ibanacuara", low: "Handwriting check: signature partially smudged" },
  factura: { title: "Hardware Store Factura", preview: "FERRETERÍA PIJAO\nFactura FV-00912\n2 lámparas solares\nTOTAL $226.100", household: "fam_05", item: "Lámpara Solar", qty: 2, cop: 226100, vendor: "Ferretería Pijao" },
};
const STEPS = ["1. Classifying Document", "2. Extracting Spanish Handwriting & COP/USD", "3. Checking 78 Families for Duplicates"];

export function Workbench() {
  const { households, deliver, currency, extraSpent, extraAssisted } = useNido();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [merge, setMerge] = useState(true);
  const [drag, setDrag] = useState(false);
  const [dispatch, setDispatch] = useState<{ es: string; en: string } | null>(null);

  useEffect(() => {
    if (!doc || step >= 3) return;
    const t = setTimeout(() => setStep((s) => s + 1), 800);
    return () => clearTimeout(t);
  }, [doc, step]);

  function load(d: Doc, image: string | null = null) { setDoc({ ...d }); setImg(image); setStep(0); setMerge(true); }
  function onFile(f?: File) {
    if (!f) return;
    load({ ...SAMPLES.census, title: f.name }, f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }
  const match = doc && households.find((h) => h.id === doc.household);

  function approve() {
    if (!doc) return;
    deliver(doc.household, [doc.item], Math.round(doc.cop / USD_TO_COP), doc.vendor, `AI-${Date.now().toString().slice(-5)}`);
    toast.success(`Published to Open Books: ${match?.name} → verified green`);
    setDoc(null); setImg(null);
  }

  function genDispatch() {
    const raised = formatMoney(TOTAL_RAISED_USD, "COP"), spent = formatMoney(BASE_SPENT_USD + extraSpent, "COP");
    const a = BASE_ASSISTED + extraAssisted;
    setDispatch({
      es: `🏡 Minga de sábado en Pijao 🌱\n${a} de ${AFFECTED} familias ya recibieron ayuda en Ibanacuara, La Maizena y Los Juanes.\n💚 Recaudado: ${raised}\n🧾 Gastado con recibo: ${spent}\n🔨 Casa 1 sigue en bahareque.\n⚠️ El Filo sigue cerrado por riesgo de derrumbe.\nCuentas a la vista: espejodeagua.org/emergencia\n#NidoAbierto #Pijao`,
      en: `Saturday minga update from Pijao, Quindío:\n${a} of ${AFFECTED} affected families have now been assisted across Resguardo Ibanacuara (Embera Chamí) and Vereda La Maizena / Los Juanes.\nRaised: ${formatMoney(TOTAL_RAISED_USD, "USD")} · Spent on verified receipts: ${formatMoney(BASE_SPENT_USD + extraSpent, "USD")}.\nCasa 1 seismic-resistant bahareque build continues. El Filo ridge trail remains paused pending retention works.\nEvery receipt is public: espejodeagua.org/emergencia. Thank you!`,
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-2xl font-semibold">Unified Smart Minga Dropzone</h2>
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
          className={cn("mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition", drag ? "border-accent bg-accent/10" : "hover:border-primary")}
        >
          <Upload className="h-8 w-8 text-primary" />
          <span className="font-medium">Drop a census form, acta or factura photo</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => load(SAMPLES.census)}>Load Sample Paper Census Form</Button>
          <Button variant="outline" onClick={() => load(SAMPLES.acta)}>Load Signed Acta Receipt</Button>
          <Button variant="outline" onClick={() => load(SAMPLES.factura)}>Load Hardware Store Factura</Button>
        </div>

        {doc && (
          <>
            <div className="mt-6 grid gap-2 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", step > i ? "border-primary bg-primary/5" : step === i ? "border-accent" : "opacity-50")}>
                  {step > i ? <Check className="h-4 w-4 text-primary" /> : step === i ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <span className="h-4 w-4" />}{s}
                </div>
              ))}
            </div>

            {step >= 3 && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-muted p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" />{doc.title}</p>
                  {img ? <img src={img} alt="Uploaded document" className="max-h-80 w-full rounded object-contain" /> : <pre className="whitespace-pre-wrap rounded bg-card p-4 font-display text-lg italic">{doc.preview}</pre>}
                </div>
                <div className="space-y-3">
                  <Field label="Item"><Input value={doc.item} onChange={(e) => setDoc({ ...doc, item: e.target.value })} /></Field>
                  <Field label="Quantity">
                    <Input type="number" value={doc.qty} onChange={(e) => setDoc({ ...doc, qty: +e.target.value })} className={doc.low ? "border-warning bg-warning/15" : ""} />
                    {doc.low && <span className="mt-1 inline-block rounded bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">⚠ {doc.low}</span>}
                  </Field>
                  <Field label="Amount (COP)">
                    <Input type="number" value={doc.cop} onChange={(e) => setDoc({ ...doc, cop: +e.target.value })} />
                    <span className="text-xs text-muted-foreground">≈ {formatMoney(doc.cop / USD_TO_COP, "USD")}</span>
                  </Field>
                  <Field label="Household">
                    <select value={doc.household} onChange={(e) => setDoc({ ...doc, household: e.target.value })} className="w-full rounded-md border bg-card p-2 text-sm">
                      {households.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.id})</option>)}
                    </select>
                  </Field>
                  {match && (
                    <div className="rounded-lg border border-accent bg-accent/10 p-3 text-sm">
                      <b>92% Match:</b> Looks like existing record '{match.name} ({match.id})' in {match.vereda}. Merge into existing household instead of creating duplicate?
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant={merge ? "default" : "outline"} onClick={() => setMerge(true)}>Merge</Button>
                        <Button size="sm" variant={!merge ? "default" : "outline"} onClick={() => setMerge(false)}>Keep separate</Button>
                      </div>
                    </div>
                  )}
                  <Button className="h-12 w-full bg-success text-primary-foreground hover:bg-success/90" onClick={approve}><Check /> Approve & Publish to Open Books</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">1-Click Bilingual Saturday Minga Dispatch</h2>
          <Button onClick={genDispatch} className="bg-accent text-accent-foreground hover:bg-accent/90">Generate from live stats</Button>
        </div>
        {dispatch && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(["es", "en"] as const).map((k) => (
              <div key={k} className="rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">{k === "es" ? "Español · WhatsApp / Instagram" : "English · GoFundMe"}</p>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(dispatch[k]); toast.success("Copied"); }}><Copy /> Copy Text</Button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm">{dispatch[k]}</pre>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Currency shown in dashboard: {currency}</p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</p>{children}</div>;
}
