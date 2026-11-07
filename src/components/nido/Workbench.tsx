import { useEffect, useRef, useState } from "react";
import { Copy, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useNido } from "@/lib/nido-store";
import { AFFECTED, BASE_ASSISTED, BASE_SPENT_USD, TOTAL_RAISED_USD, USD_TO_COP, formatMoney } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyzeMingaDocument } from "@/lib/minga-analyze.functions";
import { approveMingaDocument } from "@/lib/minga-approve.functions";
import { prepareImage } from "@/lib/image-prep";
import { SAMPLE_DELAY_MS, sampleDocument, type MingaDoc, type SampleKind } from "@/lib/minga-documents";
import { bulkTargets, fileKey, isApprovable, isBusyError, planBatch, type QueueItem } from "@/lib/minga-queue";
import { backoffMs, createPool, withRetry } from "@/lib/run-pool";
import { TransactionsTable } from "./TransactionsTable";
import { BatchQueue } from "./BatchQueue";
import { DocReviewPanel } from "./DocReviewPanel";

/** Turns a thrown error into something a coordinator can act on. */
function describeFailure(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (/unauthori[sz]ed|authorization|bearer|token/i.test(message)) return "Your coordinator session has expired. Sign out and sign in again.";
  if (/missing supabase/i.test(message)) return "The server is missing its Supabase settings. Check .env.";
  if (/failed to fetch|networkerror|load failed/i.test(message)) return "Could not reach the server. Check your connection and that the dev server is running.";
  return `Analysis failed: ${message.slice(0, 140)}`;
}

type Prepared = { mimeType: "image/png" | "image/jpeg"; base64: string };
// A few photos at a time, with a pause between starts, so a big batch cannot flood the AI provider.
const CONCURRENT_READS = 3;
const READ_GAP_MS = 1500;
const BUSY_RETRIES = 3;

export function Workbench() {
  const { households, deliver, currency, extraSpent, extraAssisted } = useNido();
  const analyze = useServerFn(analyzeMingaDocument);
  const approveDoc = useServerFn(approveMingaDocument);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [dispatch, setDispatch] = useState<{ es: string; en: string } | null>(null);
  // Large or non-serializable data stays out of React state.
  const pool = useRef(createPool(CONCURRENT_READS, { gapMs: READ_GAP_MS }));
  const files = useRef(new Map<string, File>());
  const prepared = useRef(new Map<string, Prepared>());
  const keys = useRef(new Map<string, string>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const latest = useRef({ items, households });
  latest.current = { items, households };
  const householdIds = households.map((h) => h.id);

  useEffect(() => () => {
    pool.current.clear();
    timers.current.forEach(clearTimeout);
    latest.current.items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
  }, []);

  const patch = (id: string, change: Partial<QueueItem>) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const setDoc = (id: string, doc: MingaDoc) => patch(id, { doc });

  function release(item: QueueItem) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    files.current.delete(item.id); prepared.current.delete(item.id);
    keys.current.delete(item.id);
  }

  function analyzeJob(id: string) {
    pool.current.add(async (generation) => {
      const file = files.current.get(id);
      if (!file) return;
      patch(id, { stage: "analyzing", error: null, note: null });
      try {
        const image = await prepareImage(file);
        prepared.current.set(id, image);
        const res = await withRetry(
          () => analyze({ data: { ...image, households: latest.current.households.map((h) => ({ id: h.id, name: h.name })) } }),
          (r) => !r.doc && isBusyError(r.error),
          {
            retries: BUSY_RETRIES,
            delayMs: backoffMs,
            onRetry: (_attempt, delay) => {
              pool.current.pause(delay);
              patch(id, { note: `Gemini is busy. Retrying in ${Math.round(delay / 1000)}s…` });
            },
          },
        );
        if (pool.current.isStale(generation)) return;
        if (res.doc) patch(id, { stage: "done", doc: res.doc, acknowledged: false, note: null });
        else patch(id, { stage: "error", error: res.error ?? "Analysis failed.", note: null });
      } catch (e) {
        console.error("Document analysis failed", e);
        if (!pool.current.isStale(generation)) patch(id, { stage: "error", error: describeFailure(e), note: null });
      }
    });
  }

  function onFiles(list: FileList | File[] | null | undefined) {
    const dropped = Array.from(list ?? []);
    if (!dropped.length) return;
    const existing = new Set(keys.current.values());
    const { accepted, rejected } = planBatch(dropped, existing, latest.current.items.length);
    if (rejected.length) toast.error(`Skipped ${rejected.length}: ${rejected.slice(0, 3).map((r) => `${r.name} (${r.reason})`).join("; ")}${rejected.length > 3 ? "…" : ""}`);
    if (!accepted.length) return;
    const added: QueueItem[] = accepted.map((f) => {
      const id = crypto.randomUUID();
      files.current.set(id, f); keys.current.set(id, fileKey(f));
      return { id, fileName: f.name, previewUrl: URL.createObjectURL(f), stage: "queued", doc: null, error: null, note: null, receiptId: `AI-${crypto.randomUUID()}`, acknowledged: false, real: true };
    });
    setItems((cur) => [...cur, ...added]);
    setSelectedId((cur) => cur ?? added[0]?.id ?? null);
    added.forEach((i) => analyzeJob(i.id));
  }

  function loadSample(kind: SampleKind) {
    const id = crypto.randomUUID();
    const label = { census: "Sample paper census form", acta: "Sample signed acta", factura: "Sample hardware factura" }[kind];
    setItems((cur) => [...cur, { id, fileName: label, previewUrl: null, stage: "analyzing", doc: null, error: null, note: null, receiptId: `SAMPLE-${crypto.randomUUID()}`, acknowledged: false, real: false }]);
    setSelectedId(id);
    const t = setTimeout(() => { timers.current.delete(t); patch(id, { stage: "done", doc: sampleDocument(kind) }); }, SAMPLE_DELAY_MS);
    timers.current.add(t);
  }

  function retry(id: string) { patch(id, { stage: "queued", error: null, note: null }); analyzeJob(id); }

  function remove(id: string) {
    const item = latest.current.items.find((i) => i.id === id);
    if (item) release(item);
    setItems((cur) => cur.filter((i) => i.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function clearFinished() {
    latest.current.items.filter((i) => i.stage === "approved").forEach(release);
    setItems((cur) => cur.filter((i) => i.stage !== "approved"));
    setSelectedId((cur) => (latest.current.items.find((i) => i.id === cur)?.stage === "approved" ? null : cur));
  }

  /** Saves one row. Returns whether it worked; the row records its own error so a failure never blocks the rest. */
  async function saveItem(item: QueueItem): Promise<boolean> {
    const doc = item.doc;
    if (!doc) return false;
    const match = latest.current.households.find((h) => h.id === doc.household);
    patch(item.id, { stage: "saving", error: null });
    if (!item.real) {
      // Sample documents stay in this browser session and are never written to the database.
      deliver(doc.household, doc.line_items.map((l) => l.item), Math.round(doc.cop / USD_TO_COP), doc.vendor, item.receiptId);
      patch(item.id, { stage: "approved" });
      return true;
    }
    try {
      const res = await approveDoc({ data: {
        docType: doc.doc_type, household: doc.household, vendor: doc.vendor, receipt: item.receiptId, cop: doc.cop, estimated: doc.cop_estimated,
        items: doc.line_items, transcription: doc.preview, warnings: doc.low_confidence_warnings, image: prepared.current.get(item.id) ?? null,
      } });
      if (!res.ok) { patch(item.id, { stage: "done", error: res.error }); return false; }
      prepared.current.delete(item.id);
      patch(item.id, { stage: "approved" });
      toast.success(`${match?.name ?? doc.household}: ${res.message}${res.imageSaved ? "" : " (photo not stored)"}`);
      return true;
    } catch {
      patch(item.id, { stage: "done", error: "Could not save. Check your connection and try again." });
      return false;
    }
  }

  async function approveSelected() {
    const item = latest.current.items.find((i) => i.id === selectedId);
    if (!item || !isApprovable(item, householdIds)) return;
    if (await saveItem(item)) {
      const next = latest.current.items.find((i) => i.id !== item.id && i.stage === "done");
      setSelectedId(next?.id ?? item.id);
    } else toast.error("Could not approve this row. See the message in the queue.");
  }

  async function approveReady() {
    setBulkBusy(true);
    let ok = 0, failed = 0;
    for (const item of bulkTargets(latest.current.items, latest.current.households.map((h) => h.id))) {
      if (await saveItem(item)) ok++;
      else failed++;
    }
    setBulkBusy(false);
    if (failed) toast.error(`${ok} approved, ${failed} failed. Failed rows stay in the queue with the reason.`);
    else if (ok) toast.success(`${ok} approved and published.`);
  }

  function genDispatch() {
    const raised = formatMoney(TOTAL_RAISED_USD, "COP"), spent = formatMoney(BASE_SPENT_USD + extraSpent, "COP");
    const a = BASE_ASSISTED + extraAssisted;
    setDispatch({
      es: `🏡 Minga de sábado en Pijao 🌱\n${a} de ${AFFECTED} familias ya recibieron ayuda en Ibanacuara, La Maizena y Los Juanes.\n💚 Recaudado: ${raised}\n🧾 Gastado con recibo: ${spent}\n🔨 Casa 1 sigue en bahareque.\n⚠️ El Filo sigue cerrado por riesgo de derrumbe.\nCuentas a la vista: espejodeagua.org/emergencia\n#NidoAbierto #Pijao`,
      en: `Saturday minga update from Pijao, Quindío:\n${a} of ${AFFECTED} affected families have now been assisted across Resguardo Ibanacuara (Embera Chamí) and Vereda La Maizena / Los Juanes.\nRaised: ${formatMoney(TOTAL_RAISED_USD, "USD")} · Spent on verified receipts: ${formatMoney(BASE_SPENT_USD + extraSpent, "USD")}.\nCasa 1 seismic-resistant bahareque build continues. El Filo ridge trail remains paused pending retention works.\nEvery receipt is public: espejodeagua.org/emergencia. Thank you!`,
    });
  }

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-2xl font-semibold">Unified Smart Minga Dropzone</h2>
        <p role="status" className="mt-3 rounded-lg border border-warning bg-warning/15 p-3 text-sm">Uploaded photos are read by AI three at a time. Review each result before it goes public. Sample buttons use demo data. Review each result before it goes public.</p>
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          className={cn("mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition", drag ? "border-accent bg-accent/10" : "hover:border-primary")}
        >
          <Upload className="h-8 w-8 text-primary" />
          <span className="font-medium">Drop census forms, actas or factura photos (up to 30)</span>
          <input aria-label="Upload document photos" type="file" multiple accept="image/png,image/jpeg" className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => loadSample("census")}>Load Sample Paper Census Form</Button>
          <Button variant="outline" onClick={() => loadSample("acta")}>Load Signed Acta Receipt</Button>
          <Button variant="outline" onClick={() => loadSample("factura")}>Load Hardware Store Factura</Button>
        </div>

        <BatchQueue items={items} householdIds={householdIds} selectedId={selectedId} bulkBusy={bulkBusy} onSelect={setSelectedId} onRetry={retry} onRemove={remove} onClearFinished={clearFinished} onApproveReady={approveReady} />

        {selected?.error && selected.stage !== "error" && <p role="alert" className="mt-4 rounded-lg border border-destructive p-3 text-sm text-destructive">{selected.error}</p>}
        {selected?.doc && (selected.stage === "done" || selected.stage === "saving") && (
          <div className="mt-6">
            <DocReviewPanel
              item={{ ...selected, doc: selected.doc }}
              households={households}
              canApprove={isApprovable(selected, householdIds) && !bulkBusy}
              saving={selected.stage === "saving"}
              onChange={(doc) => setDoc(selected.id, doc)}
              onAcknowledge={(acknowledged) => patch(selected.id, { acknowledged })}
              onApprove={approveSelected}
            />
          </div>
        )}
        {selected?.stage === "approved" && <p className="mt-4 text-sm text-primary">This document was saved. Pick another row from the queue.</p>}
      </section>

      <TransactionsTable variant="staff" />

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
