import { useState } from "react";
import { HardHat, Lock, MapPin, Package, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BUILDER_JOBS, MATERIAL_ORGS, createMaterialRequest, verifyBuilder, type JobType, type MaterialRequest } from "@/lib/builder-jobs";
import { cn } from "@/lib/utils";

const TYPES: { key: JobType | "all"; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "roof", label: "Techo" },
  { key: "wall", label: "Muros" },
  { key: "structure", label: "Estructura" },
];

export function Builders() {
  const [who, setWho] = useState<{ name: string; minga: string } | null>(null);
  const [form, setForm] = useState({ name: "", minga: "", code: "" });
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<JobType | "all">("all");
  const [joined, setJoined] = useState<string[]>([]);
  const [orgFor, setOrgFor] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<MaterialRequest[]>([]);

  if (!who) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-6">
        <div className="mb-3 flex items-center gap-2 text-primary"><Lock className="h-5 w-5" /><h2 className="text-xl font-semibold">Acceso para mingas y constructores</h2></div>
        <p className="mb-4 text-sm text-muted-foreground">Las ubicaciones exactas y detalles de obra solo se muestran a voluntarios verificados. Pida su código a un coordinador.</p>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const r = verifyBuilder(form);
          if (!r.ok) return setError(r.error);
          setError(""); setWho({ name: form.name.trim(), minga: form.minga.trim() });
        }}>
          {(["name", "minga", "code"] as const).map((k) => (
            <input key={k} type={k === "code" ? "password" : "text"} aria-label={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              placeholder={{ name: "Su nombre", minga: "Minga u organización", code: "Código de verificación" }[k]}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full"><ShieldCheck /> Verificar</Button>
          <p className="text-xs text-muted-foreground">Demo: código MINGA-2026</p>
        </form>
      </div>
    );
  }

  const jobs = BUILDER_JOBS.filter((j) => filter === "all" || j.type === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <p className="mr-auto text-sm">Verificado: <b>{who.name}</b> · {who.minga}. Detalles privados — no compartir fuera de la cuadrilla.</p>
        <Button variant="outline" size="sm" onClick={() => setWho(null)}>Salir</Button>
      </div>
      <div className="rounded-xl bg-primary/10 p-3 text-sm"><b>Los voluntarios nunca pagan materiales.</b> Solicítelos a una organización aliada y recójalos sin costo.</div>
      <div className="flex gap-2">
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={cn("rounded-full border px-3 py-1 text-sm", filter === t.key ? "bg-primary text-primary-foreground" : "bg-card")}>{t.label}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((j) => {
          const req = requests.find((r) => r.jobId === j.id);
          const org = orgFor[j.id] ?? MATERIAL_ORGS[0]?.id ?? "";
          return (
            <article key={j.id} className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{j.householdId} · {TYPES.find((t) => t.key === j.type)?.label}</h3>
                <span className="text-xs text-muted-foreground">{j.crewSize} personas</span>
              </div>
              <p className="text-sm">{j.scope}</p>
              <p className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5" />{j.lat.toFixed(5)}, {j.lng.toFixed(5)} — {j.accessNote}</p>
              <ul className="text-xs">{j.materials.map((m) => <li key={m.item}>• {m.qty} × {m.item}</li>)}</ul>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant={joined.includes(j.id) ? "secondary" : "default"} onClick={() => { setJoined((x) => x.includes(j.id) ? x : [...x, j.id]); toast.success(`Inscrito en ${j.householdId}`); }}>
                  <HardHat /> {joined.includes(j.id) ? "Inscrito" : "Me apunto"}
                </Button>
                {req ? (
                  <p className="text-xs">Materiales solicitados a <b>{req.paidBy}</b> · Usted paga: $0 · Recoger: {MATERIAL_ORGS.find((o) => o.id === req.orgId)?.pickup}</p>
                ) : (
                  <>
                    <select aria-label="Organización" value={org} onChange={(e) => setOrgFor({ ...orgFor, [j.id]: e.target.value })} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {MATERIAL_ORGS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => { setRequests((r) => [...r, createMaterialRequest(j, org)]); toast.success("Solicitud enviada — sin costo para usted"); }}>
                      <Package /> Pedir materiales
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
