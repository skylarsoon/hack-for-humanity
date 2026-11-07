import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIES, type ImpactCategory } from "@/lib/donor-impact";
import { formatMoney } from "@/lib/nido-data";
import { useNido } from "@/lib/nido-store";
import { subscribeLedger } from "@/lib/ledger-client";
import { documentSource, downloadCsv, fetchStaffData, summarize, toCsv, type StaffData } from "@/lib/staff-data";
import { ZoomableImage } from "./ZoomableImage";

const when = (iso: string) => new Date(iso).toLocaleString();
const catLabel = (c: string) => (c in CATEGORIES ? `${CATEGORIES[c as ImpactCategory].icon} ${CATEGORIES[c as ImpactCategory].en}` : c);

/** Loads a private document photo on demand through a short-lived signed link. */
function StoredPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  async function load() {
    setState("loading");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (error || !data) setState("failed"); else setUrl(data.signedUrl);
  }
  if (url) return <div className="w-28"><ZoomableImage src={url} alt="Stored document photo" className="h-20 object-cover" /></div>;
  return <Button size="sm" variant="outline" onClick={load} disabled={state === "loading"}>{state === "failed" ? "Unavailable" : state === "loading" ? "…" : "View photo"}</Button>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-primary">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TabTools({ filter, setFilter, onCsv, count }: { filter: string; setFilter: (v: string) => void; onCsv: () => void; count: number }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" aria-label="Filter rows" className="max-w-xs" />
      <span className="text-xs text-muted-foreground">{count} row{count === 1 ? "" : "s"}</span>
      <Button size="sm" variant="outline" className="ml-auto" onClick={onCsv}><Download /> CSV</Button>
    </div>
  );
}

const matches = (row: unknown[], q: string) => !q.trim() || row.join(" ").toLowerCase().includes(q.trim().toLowerCase());

export function StaffDashboard() {
  const { currency } = useNido();
  const [data, setData] = useState<StaffData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(() => {
    fetchStaffData().then((d) => { setData(d); setError(null); }).catch((e) => { console.error("Staff data load failed", e); setError(e instanceof Error ? e.message : "Could not load."); });
  }, []);
  useEffect(() => { load(); return subscribeLedger(load); }, [load]);

  const label = useMemo(() => {
    const names = new Map((data?.households ?? []).map((h) => [h.id, (h.name ?? "").replace(/^Familia\s+/i, "")]));
    return (id: string) => (names.get(id) ? `${id} · ${names.get(id)}` : id);
  }, [data]);
  const docById = useMemo(() => new Map((data?.documents ?? []).map((d) => [d.id, d])), [data]);

  if (error) return <p role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">Could not load the dashboard: {error} <Button size="sm" variant="outline" className="ml-2" onClick={load}>Retry</Button></p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const s = summarize(data);
  const purchases = data.expenses.map((e) => ({
    id: e.id, date: e.date, vendor: e.vendor, receipt: e.receipt,
    families: e.expense_households.map((h) => label(h.household_id)).join(", "),
    items: e.expense_items.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.item} [${i.category}]`).join("; "),
    usd: Number(e.usd), cop: Number(e.cop), source: e.source, saved: when(e.created_at), photo: e.document_id ? docById.get(e.document_id)?.image_path ?? null : null,
  })).filter((r) => matches(Object.values(r), filter));
  const families = data.households.map((h) => {
    const mine = data.needs.filter((n) => n.household_id === h.id);
    const open = mine.filter((n) => n.status === "open");
    return { id: h.id, name: h.name ?? "", vereda: h.vereda, community: h.community, members: h.members, phase: h.phase, status: h.status, costUsd: Number(h.cost_usd),
      openNeeds: open.map((n) => `${n.qty}× ${n.item}`).join("; "), openUsd: open.reduce((a, n) => a + n.qty * Number(n.unit_usd), 0),
      delivered: mine.filter((n) => n.status === "delivered").map((n) => n.item).join("; "), location: h.lat != null && h.lng != null ? `${h.lat}, ${h.lng}` : "", note: h.note ?? "" };
  }).filter((r) => matches(Object.values(r), filter));
  const needs = data.needs.map((n) => ({
    id: n.id, family: label(n.household_id), item: n.item, qty: n.qty, unitUsd: Number(n.unit_usd), subtotalUsd: n.qty * Number(n.unit_usd),
    category: n.category, status: n.status, saved: when(n.created_at), from: n.document_id ? documentSource(docById.get(n.document_id) ?? { extracted: null }) : "seed",
  })).filter((r) => matches(Object.values(r), filter));
  const documents = data.documents.map((d) => {
    const x = (d.extracted ?? {}) as { vendor?: string; cop?: number; household?: string; survey?: Record<string, string>; hazard?: boolean };
    const detail = documentSource(d) === "field" ? `${x.household ?? ""}${x.hazard ? " · hazard alert" : ""} · ${Object.keys(x.survey ?? {}).length} survey answers` : `${x.vendor ?? ""}${x.cop ? ` · ${formatMoney(x.cop, "COP")}` : ""}`;
    return { id: d.id, saved: when(d.created_at), type: d.doc_type, source: documentSource(d), detail, transcription: (d.transcription ?? "").slice(0, 160), photo: d.image_path };
  }).filter((r) => matches(Object.values(r), filter));

  const csv = (name: string, cols: { key: string; label: string }[], rows: Record<string, unknown>[]) => { downloadCsv(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(cols, rows)); toast.success("CSV downloaded"); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-2xl font-semibold">Coordinator dashboard</h2>
          <p className="text-sm text-muted-foreground">Everything stored in the database, including private family details. Visible only while signed in.</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw /> Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Families" value={String(s.households)} hint={`${s.needsHelp} need help · ${s.delivered} delivered`} />
        <Stat label="Spent (recorded)" value={formatMoney(s.spentUsd, currency)} hint={`${formatMoney(s.newSpentUsd, currency)} from app approvals`} />
        <Stat label="Open needs budget" value={formatMoney(s.openNeedsUsd, currency)} hint={`${s.openNeedCount} open items`} />
        <Stat label="Documents" value={String(s.documents)} hint="photos, forms and field entries" />
      </div>

      <div className="rounded-xl bg-card p-4 shadow-card">
        <Tabs defaultValue="purchases" onValueChange={() => setFilter("")}>
          <TabsList>
            <TabsTrigger value="purchases">Purchases ({data.expenses.length})</TabsTrigger>
            <TabsTrigger value="families">Families ({data.households.length})</TabsTrigger>
            <TabsTrigger value="needs">Needs ({data.needs.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({data.documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            <TabTools filter={filter} setFilter={setFilter} count={purchases.length} onCsv={() => csv("purchases", [{ key: "date", label: "Date" }, { key: "vendor", label: "Vendor" }, { key: "receipt", label: "Receipt" }, { key: "families", label: "Families" }, { key: "items", label: "Items" }, { key: "usd", label: "USD" }, { key: "cop", label: "COP" }, { key: "source", label: "Source" }, { key: "saved", label: "Saved at" }], purchases)} />
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Vendor</TableHead><TableHead>Receipt</TableHead><TableHead>Families</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Source</TableHead><TableHead>Photo</TableHead></TableRow></TableHeader>
              <TableBody>
                {purchases.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.date}<span className="block text-xs text-muted-foreground">{r.saved}</span></TableCell>
                    <TableCell>{r.vendor}</TableCell>
                    <TableCell className="font-mono text-xs">{r.receipt}</TableCell>
                    <TableCell>{r.families}</TableCell>
                    <TableCell className="min-w-48 text-xs">{r.items}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(r.usd, "USD")}<span className="block text-xs text-muted-foreground">{formatMoney(r.cop, "COP")}</span></TableCell>
                    <TableCell className="text-xs">{r.source}</TableCell>
                    <TableCell>{r.photo ? <StoredPhoto path={r.photo} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
                {!purchases.length && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">No purchases match.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="families">
            <TabTools filter={filter} setFilter={setFilter} count={families.length} onCsv={() => csv("families", [{ key: "id", label: "ID" }, { key: "name", label: "Family" }, { key: "vereda", label: "Vereda" }, { key: "community", label: "Community" }, { key: "members", label: "Members" }, { key: "phase", label: "Phase" }, { key: "status", label: "Status" }, { key: "costUsd", label: "Cost USD" }, { key: "openNeeds", label: "Open needs" }, { key: "openUsd", label: "Open needs USD" }, { key: "delivered", label: "Delivered" }, { key: "location", label: "Location" }, { key: "note", label: "Note" }], families)} />
            <Table>
              <TableHeader><TableRow><TableHead>Family</TableHead><TableHead>Where</TableHead><TableHead>Members</TableHead><TableHead>Phase</TableHead><TableHead>Status</TableHead><TableHead>Open needs</TableHead><TableHead>Delivered</TableHead><TableHead className="text-right">Cost</TableHead><TableHead>Private</TableHead></TableRow></TableHeader>
              <TableBody>
                {families.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-medium">{r.id}<span className="block text-xs font-normal text-muted-foreground">{r.name}</span></TableCell>
                    <TableCell className="text-xs">{r.vereda}<span className="block text-muted-foreground">{r.community}</span></TableCell>
                    <TableCell>{r.members}</TableCell>
                    <TableCell>F{r.phase}</TableCell>
                    <TableCell className="text-xs">{r.status}</TableCell>
                    <TableCell className="min-w-40 text-xs">{r.openNeeds || "—"}{r.openUsd > 0 && <span className="block text-muted-foreground">{formatMoney(r.openUsd, "USD")}</span>}</TableCell>
                    <TableCell className="min-w-32 text-xs">{r.delivered || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(r.costUsd, "USD")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.location}{r.note && <span className="block">{r.note}</span>}</TableCell>
                  </TableRow>
                ))}
                {!families.length && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">No families match.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="needs">
            <TabTools filter={filter} setFilter={setFilter} count={needs.length} onCsv={() => csv("needs", [{ key: "family", label: "Family" }, { key: "item", label: "Item" }, { key: "qty", label: "Qty" }, { key: "unitUsd", label: "Unit USD" }, { key: "subtotalUsd", label: "Subtotal USD" }, { key: "category", label: "Category" }, { key: "status", label: "Status" }, { key: "from", label: "From" }, { key: "saved", label: "Saved at" }], needs)} />
            <Table>
              <TableHeader><TableRow><TableHead>Family</TableHead><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Budget</TableHead><TableHead>Status</TableHead><TableHead>From</TableHead></TableRow></TableHeader>
              <TableBody>
                {needs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.family}</TableCell>
                    <TableCell>{r.item}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{catLabel(r.category)}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(r.subtotalUsd, "USD")}<span className="block text-xs text-muted-foreground">{formatMoney(r.unitUsd, "USD")} each</span></TableCell>
                    <TableCell className="text-xs">{r.status}</TableCell>
                    <TableCell className="text-xs">{r.from}<span className="block text-muted-foreground">{r.saved}</span></TableCell>
                  </TableRow>
                ))}
                {!needs.length && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No needs match.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="documents">
            <TabTools filter={filter} setFilter={setFilter} count={documents.length} onCsv={() => csv("documents", [{ key: "saved", label: "Saved at" }, { key: "type", label: "Type" }, { key: "source", label: "Source" }, { key: "detail", label: "Detail" }, { key: "transcription", label: "Transcription" }], documents)} />
            <Table>
              <TableHeader><TableRow><TableHead>Saved</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Detail</TableHead><TableHead>Transcription</TableHead><TableHead>Photo</TableHead></TableRow></TableHeader>
              <TableBody>
                {documents.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{r.saved}</TableCell>
                    <TableCell className="text-xs">{r.type.replaceAll("_", " ").toLowerCase()}</TableCell>
                    <TableCell className="text-xs">{r.source}</TableCell>
                    <TableCell className="text-xs">{r.detail}</TableCell>
                    <TableCell className="min-w-48 whitespace-pre-wrap text-xs text-muted-foreground">{r.transcription || "—"}</TableCell>
                    <TableCell>{r.photo ? <StoredPhoto path={r.photo} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
                {!documents.length && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No documents yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
