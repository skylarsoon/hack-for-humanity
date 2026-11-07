import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNido } from "@/lib/nido-store";
import { AFFECTED, BASE_ASSISTED, BASE_SPENT_USD, TOTAL_RAISED_USD, USD_TO_COP, formatMoney } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { analyzeMingaDocument } from "@/lib/minga-analyze.functions";
// Shared fixtures retain the HH household IDs used by the map, ledger and field queue.
import { SAMPLE_DELAY_MS, sampleDocument, supportedPhoto, validApproval, type MingaDoc, type SampleKind } from "@/lib/minga-documents";

const STEPS = ["1. Document classification", "2. Handwriting & COP/USD review", "3. Household match review"];

export function Workbench() {
  const { households, deliver, currency, extraSpent, extraAssisted } = useNido();
  const [doc, setDoc] = useState<MingaDoc | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const pending = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previewUrl = useRef<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [dispatch, setDispatch] = useState<{ es: string; en: string } | null>(null);
  const [real, setReal] = useState(false);
  const analyze = useServerFn(analyzeMingaDocument);

  useEffect(() => () => {
    pending.current.forEach(clearTimeout);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  function load(kind: SampleKind, image: string | null = null, name = "") {
    pending.current.forEach(clearTimeout);
    if (previewUrl.current && previewUrl.current !== image) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = image;
    setImg(image); setUploadName(name); setDoc(null); setStep(0);
    setBusy(true); setFallback(Boolean(image)); setAcknowledged(false); setReal(false);
    pending.current = [
      setTimeout(() => setStep(1), SAMPLE_DELAY_MS / 3),
      setTimeout(() => setStep(2), SAMPLE_DELAY_MS * 2 / 3),
      setTimeout(() => { setDoc(sampleDocument(kind)); setStep(3); setBusy(false); }, SAMPLE_DELAY_MS),
    ];
  }
  async function onFile(f?: File) {
    if (!f) return;
    if (!supportedPhoto(f.type)) { toast.error("Choose a PNG or JPG photo."); return; }
    if (f.size > 10_000_000) { toast.error("Photo is too large (max 10 MB)."); return; }
    pending.current.forEach(clearTimeout);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    const url = URL.createObjectURL(f);
    previewUrl.current = url;
    setImg(url); setUploadName(f.name); setDoc(null); setStep(0); setBusy(true); setFallback(false); setAcknowledged(false); setReal(false);
    pending.current = [setTimeout(() => setStep(1), 1500), setTimeout(() => setStep(2), 3500)];
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const res = await analyze({ data: { mimeType: f.type as "image/png" | "image/jpeg", base64: btoa(bin), households: households.map((h) => ({ id: h.id, name: h.name })) } });
      pending.current.forEach(clearTimeout);
      if (res.doc) { setDoc(res.doc); setReal(true); setStep(3); }
      else { toast.error(res.error ?? "Analysis failed."); setImg(null); }
    } catch {
      toast.error("Analysis failed."); setImg(null);
    } finally { setBusy(false); }
  }
  const match = doc && households.find((h) => h.id === doc.household);
  const canApprove = doc && validApproval(doc, households.map((h) => h.id)) && acknowledged;

  function approve() {
    if (!doc || !canApprove) return;
    deliver(doc.household, [doc.item], Math.round(doc.cop / USD_TO_COP), doc.vendor, `${real ? "AI" : "SAMPLE"}-${crypto.randomUUID()}`);
    toast.success(`${real ? "Approved" : "Sample approved"}: ${match?.name} → delivered; ledger updated`);
    setDoc(null); setImg(null);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
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
        <p role="status" className="mt-3 rounded-lg border border-warning bg-warning/15 p-3 text-sm">Uploaded photos are read by Gemini · Sample buttons use demo data. Approvals update this session only.</p>
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
          className={cn("mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition", drag ? "border-accent bg-accent/10" : "hover:border-primary")}
        >
          <Upload className="h-8 w-8 text-primary" />
          <span className="font-medium">Drop a census form, acta or factura photo</span>
          <input aria-label="Upload document photo" type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => load("census")}>Load Sample Paper Census Form</Button>
          <Button variant="outline" onClick={() => load("acta")}>Load Signed Acta Receipt</Button>
          <Button variant="outline" onClick={() => load("factura")}>Load Hardware Store Factura</Button>
        </div>

        {(doc || busy) && (
          <>
            <div className="mt-6 grid gap-2 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", step > i ? "border-primary bg-primary/5" : step === i ? "border-accent" : "opacity-50")}>
                  {step > i ? <Check className="h-4 w-4 text-primary" /> : step === i ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <span className="h-4 w-4" />}{s}
                </div>
              ))}
            </div>

            {doc && step >= 3 && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-muted p-4">
                  <p className="mb-2 flex items-center gap-2 break-all text-sm font-semibold"><FileText className="h-4 w-4 shrink-0" />{uploadName || doc.title}</p>
                  {img ? <><img src={img} alt="Uploaded document" className="max-h-80 w-full rounded object-contain" />{real && doc.preview && <pre className="mt-3 whitespace-pre-wrap rounded bg-card p-3 text-sm">{doc.preview}</pre>}</> : <pre className="whitespace-pre-wrap rounded bg-card p-4 font-display text-lg italic">{doc.preview}</pre>}
                  {fallback && <p role="alert" className="mt-3 text-sm text-destructive">This photo has not been analyzed. The fields are sample census data, not extracted from your photo.</p>}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">{real ? "GEMINI EXTRACTION" : "SAMPLE"} · {doc.doc_type.replaceAll("_", " ")}</p>
                  <Field label="Item"><Input value={doc.item} onChange={(e) => setDoc({ ...doc, item: e.target.value })} /></Field>
                  <Field label="Quantity">
                    <Input min={1} step={1} type="number" value={doc.qty} onChange={(e) => setDoc({ ...doc, qty: +e.target.value })} className={doc.low_confidence_warnings.length ? "border-warning bg-warning/15" : ""} />
                    {doc.low_confidence_warnings.map((warning) => <span key={warning} className="mt-1 inline-block rounded bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">⚠ {warning}</span>)}
                  </Field>
                  <Field label="Amount (COP)">
                    <Input min={0} type="number" value={doc.cop} onChange={(e) => setDoc({ ...doc, cop: +e.target.value })} />
                    <span className="text-xs text-muted-foreground">≈ {formatMoney(doc.cop / USD_TO_COP, "USD")}</span>
                  </Field>
                  <Field label="Household">
                    <select value={doc.household} onChange={(e) => setDoc({ ...doc, household: e.target.value })} className="w-full rounded-md border bg-card p-2 text-sm">
                      <option value="">Select a household</option>
                      {households.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.id})</option>)}
                    </select>
                  </Field>
                  {doc.entity_resolution?.is_potential_duplicate && (
                    <div className="rounded-lg border border-accent bg-accent/10 p-3 text-sm">
                      <b>{Math.round(doc.entity_resolution.similarity_score * 100)}% Match:</b> {doc.entity_resolution.explanation}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant={doc.household === doc.entity_resolution.matched_family_id ? "default" : "outline"} onClick={() => { const resolution = doc.entity_resolution; if (resolution) setDoc({ ...doc, household: resolution.matched_family_id }); }}>Merge</Button>
                        <Button size="sm" variant="outline" onClick={() => setDoc({ ...doc, household: "", entity_resolution: null })}>Choose another household</Button>
                      </div>
                    </div>
                  )}
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />{real ? "I checked these fields against the photo." : "I reviewed these sample fields and want to update the demo dashboard."}</label>
                  <Button disabled={!canApprove} className="min-h-12 w-full whitespace-normal bg-success text-primary-foreground hover:bg-success/90" onClick={approve}><Check className="shrink-0" /> Approve & Publish to Open Books</Button>
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
