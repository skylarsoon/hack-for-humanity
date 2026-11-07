import { AlertTriangle, Check, CircleDashed, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { USD_TO_COP, formatMoney } from "@/lib/nido-data";
import { attentionReasons, bulkTargets, rowState, type QueueItem, type RowState } from "@/lib/minga-queue";

const CHIP: Record<RowState, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-muted text-muted-foreground" },
  reading: { label: "Reading…", cls: "bg-accent/15 text-accent-foreground" },
  ready: { label: "Ready", cls: "bg-success/15 text-primary" },
  attention: { label: "Needs check", cls: "bg-warning/25 text-warning-foreground" },
  error: { label: "Error", cls: "bg-destructive/10 text-destructive" },
  saving: { label: "Saving…", cls: "bg-accent/15 text-accent-foreground" },
  saved: { label: "Saved", cls: "bg-success/15 text-primary" },
};

interface Props {
  items: QueueItem[];
  householdIds: string[];
  selectedId: string | null;
  bulkBusy: boolean;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClearFinished: () => void;
  onApproveReady: () => void;
}

export function BatchQueue({ items, householdIds, selectedId, bulkBusy, onSelect, onRetry, onRemove, onClearFinished, onApproveReady }: Props) {
  if (!items.length) return null;
  const targets = bulkTargets(items, householdIds);
  const totalUsd = targets.reduce((sum, i) => sum + (i.doc && i.doc.doc_type !== "CENSUS_FORM" ? i.doc.cop / USD_TO_COP : 0), 0);
  const reading = items.filter((i) => i.stage === "queued" || i.stage === "analyzing").length;
  const saved = items.filter((i) => i.stage === "approved").length;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-lg font-semibold">Review queue <span className="text-sm font-normal text-muted-foreground">· {items.length} photo{items.length === 1 ? "" : "s"}{reading ? ` · ${reading} still being read` : ""}{saved ? ` · ${saved} saved` : ""}</span></h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!targets.length || bulkBusy} className="bg-success text-primary-foreground hover:bg-success/90">{bulkBusy ? <Loader2 className="animate-spin" /> : <Check />} Approve all ready ({targets.length})</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve {targets.length} document{targets.length === 1 ? "" : "s"}?</AlertDialogTitle>
              <AlertDialogDescription>
                These will be published to the open books{totalUsd > 0 ? ` (about ${formatMoney(totalUsd, "USD")} in spending)` : ""}. Rows still marked "Needs check" are skipped unless you ticked them as checked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onApproveReady}>Approve all</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" disabled={!saved || bulkBusy} onClick={onClearFinished}>Clear saved</Button>
      </div>
      <p className="text-xs text-muted-foreground">The queue lives in this browser tab. Refreshing the page clears photos you haven't approved.</p>
      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {items.map((i) => {
          const state = rowState(i, householdIds);
          const reasons = i.doc && i.stage === "done" ? attentionReasons(i.doc, householdIds) : [];
          return (
            <li key={i.id}>
              <div className={cn("flex items-center gap-3 rounded-lg border p-2", selectedId === i.id && "border-primary bg-primary/5")}>
                <button type="button" onClick={() => onSelect(i.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open ${i.fileName}`} aria-current={selectedId === i.id}>
                  {i.previewUrl ? <img src={i.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-xs">DEMO</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.fileName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {i.error ?? (i.doc ? `${i.doc.doc_type.replaceAll("_", " ").toLowerCase()} · ${i.doc.household || "no household"} · ${formatMoney(i.doc.cop, "COP")}${reasons.length ? ` · ${reasons.join(", ")}` : ""}` : state === "queued" ? "Waiting its turn…" : i.note ?? "Reading the photo…")}
                    </span>
                  </span>
                </button>
                <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", CHIP[state].cls)}>
                  {state === "reading" || state === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : state === "attention" || state === "error" ? <AlertTriangle className="h-3 w-3" /> : state === "queued" ? <CircleDashed className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {CHIP[state].label}
                </span>
                {i.stage === "error" && <Button size="sm" variant="outline" onClick={() => onRetry(i.id)}><RotateCcw /> Retry</Button>}
                {i.stage !== "analyzing" && i.stage !== "saving" && <Button size="icon" variant="ghost" aria-label={`Remove ${i.fileName}`} onClick={() => onRemove(i.id)}><X /></Button>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
