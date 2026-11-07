import { RefreshCw } from "lucide-react";
import { useNido } from "@/lib/nido-store";
import { CATEGORIES } from "@/lib/donor-impact";
import { formatMoney } from "@/lib/nido-data";
import { fieldHouseholdLabel } from "@/lib/field-household-ids";
import { latestTransactions, type TransactionKind } from "@/lib/transactions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const KIND = {
  verified: { es: "Recibo verificado", en: "Verified receipt" },
  demo: { es: "Demo (solo este navegador)", en: "Demo (this browser only)" },
  session: { es: "Sesión (solo este navegador)", en: "Session (this browser only)" },
} satisfies Record<TransactionKind, { es: string; en: string }>;

/**
 * Latest spending. "public" never shows vendor, receipt number or household, only date, category, items and amount.
 * "staff" adds those columns plus data-source status for debugging.
 */
export function TransactionsTable({ variant, limit = 10 }: { variant: "public" | "staff"; limit?: number }) {
  const { lang, currency, expenses, households, ledgerLoaded, ledgerError, refreshLedger } = useNido();
  const es = lang === "es";
  const staff = variant === "staff";
  const rows = latestTransactions(expenses, limit);
  const th = es
    ? { date: "Fecha", cat: "Categoría", items: "Artículos", amount: "Monto", status: "Estado", vendor: "Proveedor", receipt: "Recibo", hh: "Hogar", src: "Fuente" }
    : { date: "Date", cat: "Category", items: "Items", amount: "Amount", status: "Status", vendor: "Vendor", receipt: "Receipt", hh: "Household", src: "Source" };

  return (
    <section className="rounded-xl bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{es ? "Últimas transacciones" : "Latest transactions"}</h3>
        {staff && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span role="status">{ledgerError ? `⚠ Demo data: ${ledgerError}` : ledgerLoaded ? `● Database connected · ${rows.length} shown` : "Loading…"}</span>
            <Button size="sm" variant="outline" onClick={refreshLedger}><RefreshCw /> Refresh</Button>
          </div>
        )}
      </div>
      {!staff && <p className="mt-1 text-xs text-muted-foreground">{es ? "Sin nombres de familias, proveedores ni números de recibo." : "No family names, vendors or receipt numbers."}</p>}
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{th.date}</TableHead>
            <TableHead>{th.cat}</TableHead>
            <TableHead>{th.items}</TableHead>
            {staff && <><TableHead>{th.vendor}</TableHead><TableHead>{th.receipt}</TableHead><TableHead>{th.hh}</TableHead><TableHead>{th.src}</TableHead></>}
            {!staff && <TableHead>{th.status}</TableHead>}
            <TableHead className="text-right">{th.amount}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">{r.date}</TableCell>
              <TableCell className="whitespace-nowrap">{CATEGORIES[r.category].icon} {CATEGORIES[r.category][lang]}</TableCell>
              <TableCell className="min-w-48">{r.items}</TableCell>
              {staff && (
                <>
                  <TableCell>{r.vendor}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{r.receipt}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.householdIds.map((id) => fieldHouseholdLabel(id, households, {})).join(", ")}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.source}{r.createdAt ? ` · ${new Date(r.createdAt).toLocaleString()}` : ""}</TableCell>
                </>
              )}
              {!staff && <TableCell className="whitespace-nowrap text-xs">{KIND[r.kind][lang]}</TableCell>}
              <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatMoney(r.usd, currency)}</TableCell>
            </TableRow>
          ))}
          {!rows.length && <TableRow><TableCell colSpan={staff ? 8 : 5} className="py-6 text-center text-muted-foreground">—</TableCell></TableRow>}
        </TableBody>
      </Table>
    </section>
  );
}
