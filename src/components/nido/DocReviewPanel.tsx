import { Check, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type ImpactCategory } from "@/lib/donor-impact";
import { USD_TO_COP, formatMoney, type Household } from "@/lib/nido-data";
import { unpricedItems } from "@/lib/minga-ledger";
import type { MingaDoc } from "@/lib/minga-documents";
import { attentionReasons, type QueueItem } from "@/lib/minga-queue";
import { ZoomableImage } from "./ZoomableImage";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</p>{children}</div>;
}

interface Props {
  item: QueueItem & { doc: MingaDoc };
  households: Household[];
  canApprove: boolean;
  saving: boolean;
  onChange: (doc: MingaDoc) => void;
  onAcknowledge: (value: boolean) => void;
  onApprove: () => void;
}

/** Review and edit one classified document. The photo opens in a zoomable viewer. */
export function DocReviewPanel({ item, households, canApprove, saving, onChange, onAcknowledge, onApprove }: Props) {
  const { doc, real } = item;
  const match = households.find((h) => h.id === doc.household);
  const reasons = attentionReasons(doc, households.map((h) => h.id));
  const setLine = (i: number, patch: Partial<MingaDoc["line_items"][number]>) => onChange({ ...doc, line_items: doc.line_items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-muted p-4">
        <p className="mb-2 flex items-center gap-2 break-all text-sm font-semibold"><FileText className="h-4 w-4 shrink-0" />{item.fileName || doc.title}</p>
        {item.previewUrl
          ? <><ZoomableImage src={item.previewUrl} alt={`Photo of ${item.fileName}`} className="max-h-80" />{real && doc.preview && <pre className="mt-3 whitespace-pre-wrap rounded bg-card p-3 text-sm">{doc.preview}</pre>}</>
          : <pre className="whitespace-pre-wrap rounded bg-card p-4 font-display text-lg italic">{doc.preview}</pre>}
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">{real ? "GEMINI EXTRACTION" : "SAMPLE"} · {doc.doc_type.replaceAll("_", " ")}</p>
        {reasons.length > 0 && <p className="rounded bg-warning/15 px-2 py-1 text-xs font-medium">Needs your check: {reasons.join(" · ")}</p>}
        <Field label={doc.line_items.length > 1 ? "Items" : "Item"}>
          <div className="space-y-2">
            {doc.line_items.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={`Item ${i + 1}`} value={l.item} onChange={(e) => setLine(i, { item: e.target.value })} />
                <select aria-label={`Category ${i + 1}`} value={l.category} onChange={(e) => setLine(i, { category: e.target.value as ImpactCategory })} className="w-36 shrink-0 rounded-md border bg-card p-2 text-sm">
                  {(Object.keys(CATEGORIES) as ImpactCategory[]).map((k) => <option key={k} value={k}>{CATEGORIES[k].icon} {CATEGORIES[k].en}</option>)}
                </select>
                <Input aria-label={`Quantity ${i + 1}`} min={1} step={1} type="number" value={l.qty} onChange={(e) => setLine(i, { qty: +e.target.value })} className={`w-24 shrink-0 ${doc.low_confidence_warnings.length ? "border-warning bg-warning/15" : ""}`} />
              </div>
            ))}
          </div>
          {doc.low_confidence_warnings.map((warning) => <span key={warning} className="mt-1 inline-block rounded bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">⚠ {warning}</span>)}
        </Field>
        <Field label="Total (COP)">
          <Input min={0} type="number" value={doc.cop} onChange={(e) => onChange({ ...doc, cop: +e.target.value, cop_estimated: false })} />
          <span className="text-xs text-muted-foreground">≈ {formatMoney(doc.cop / USD_TO_COP, "USD")}</span>
          {doc.cop_estimated && <span className="mt-1 block rounded bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">⚠ No total printed: estimated from reference prices. Edit it if you know the real amount.</span>}
          {doc.doc_type !== "CENSUS_FORM" && doc.cop <= 0 && <span className="mt-1 block text-xs text-destructive">Enter the amount paid to approve.</span>}
        </Field>
        <Field label="Household">
          <select value={doc.household} onChange={(e) => onChange({ ...doc, household: e.target.value })} className="w-full rounded-md border bg-card p-2 text-sm">
            <option value="">Select a household</option>
            {households.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.id})</option>)}
          </select>
        </Field>
        {doc.entity_resolution?.is_potential_duplicate && (
          <div className="rounded-lg border border-accent bg-accent/10 p-3 text-sm">
            <b>{Math.round(doc.entity_resolution.similarity_score * 100)}% Match:</b> {doc.entity_resolution.explanation}
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant={doc.household === doc.entity_resolution.matched_family_id ? "default" : "outline"} onClick={() => { const r = doc.entity_resolution; if (r) onChange({ ...doc, household: r.matched_family_id }); }}>Merge</Button>
              <Button size="sm" variant="outline" onClick={() => onChange({ ...doc, household: "", entity_resolution: null })}>Choose another household</Button>
            </div>
          </div>
        )}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={item.acknowledged} onChange={(e) => onAcknowledge(e.target.checked)} className="mt-1" />{real ? (doc.cop_estimated ? "This total is an estimate from reference prices. I confirm it, or I corrected it." : "I checked these fields against the photo.") : "I reviewed these sample fields and want to update the demo dashboard."}</label>
        {real && doc.doc_type === "CENSUS_FORM" && unpricedItems(doc.line_items).length > 0 && <p className="text-xs text-muted-foreground">No reference price for: {unpricedItems(doc.line_items).join(", ")}. These count as $0 in the needs budget.</p>}
        <Button disabled={!canApprove || saving} className="min-h-12 w-full whitespace-normal bg-success text-primary-foreground hover:bg-success/90" onClick={onApprove}>
          {saving ? <Loader2 className="shrink-0 animate-spin" /> : <Check className="shrink-0" />} {real && doc.doc_type === "CENSUS_FORM" ? "Approve & add to needs budget" : "Approve & Publish to Open Books"}{match ? ` · ${match.id}` : ""}
        </Button>
      </div>
    </div>
  );
}
