import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncFieldUpdates } from "@/lib/field-sync.functions";
import { buildSurvey } from "@/lib/field-surveys";
import { ArrowLeft, Camera, ClipboardList, Plus, Save, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useNido } from "@/lib/nido-store";
import { SUPPLIES } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldHouseholdIds, fieldHouseholdLabel, validateFieldHouseholdId, validateFieldSurname } from "@/lib/field-household-ids";
import { cn } from "@/lib/utils";

export function FieldCrew() {
  const { households, queue, setQueue, deliver, refreshLedger, fieldAddedIds, setFieldAddedIds } = useNido();
  const syncFn = useServerFn(syncFieldUpdates);
  const [syncing, setSyncing] = useState(false);
  const [hid, setHid] = useState(households[0]?.id ?? "");
  const [newId, setNewId] = useState("");
  const [idError, setIdError] = useState<string | null>(null);
  const ids = fieldHouseholdIds(households, fieldAddedIds);
  const [newSurname, setNewSurname] = useState("");
  const [addedNames, setAddedNames] = useState<Record<string, string>>({});
  const label = (id: string) => fieldHouseholdLabel(id, households, addedNames);
  const [items, setItems] = useState<string[]>([]);
  const [photo, setPhoto] = useState(false);

  const toggle = (k: string) => setItems((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  function addId() {
    const result = validateFieldHouseholdId(newId, ids);
    if (result.error || !result.id) { setIdError(result.error ?? "ID inválido"); return; }
    const sn = validateFieldSurname(newSurname);
    if (sn.error) { setIdError(sn.error); return; }
    const addedId = result.id;
    if (sn.surname) setAddedNames((m) => ({ ...m, [addedId]: sn.surname }));
    setNewSurname("");
    setFieldAddedIds((previous) => [...previous, addedId]);
    setHid(result.id);
    setNewId("");
    setIdError(null);
    toast.success("ID de hogar añadido a las opciones de esta sesión");
  }

  const [surveying, setSurveying] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function startSurvey() {
    if (!ids.includes(hid)) { toast.error("Seleccione un ID de hogar"); return; }
    if (!items.length) { toast.error("Toque al menos un ícono"); return; }
    setAnswers({}); setSurveying(true);
  }

  function save() {
    setQueue((q) => [...q, { id: crypto.randomUUID(), householdId: hid, items, photo, survey: answers, at: new Date().toTimeString().slice(0, 5) }]);
    setItems([]); setPhoto(false); setSurveying(false); setAnswers({});
    toast.success("Encuesta guardada sin señal ✔");
  }

  if (surveying) {
    const sections = buildSurvey(items);
    return (
      <div className="mx-auto w-full max-w-[420px] rounded-[2.5rem] border-8 border-foreground bg-background p-4 shadow-card">
        <div className="mx-auto mb-3 h-1.5 w-24 rounded-full bg-foreground/80" />
        <button onClick={() => setSurveying(false)} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Volver</button>
        <h2 className="mt-2 font-display text-xl font-semibold">Encuesta · {hid}</h2>
        <p className="text-xs text-muted-foreground">Solo se muestran preguntas de las necesidades seleccionadas. Pida consentimiento antes de fotos o GPS. No registre nombres ni teléfonos.</p>
        <form className="mt-3 space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {sections.map((s) => (
            <fieldset key={s.key} className="space-y-3 rounded-xl border bg-card p-3">
              <legend className="px-1 text-sm font-bold text-primary">{s.title}</legend>
              {s.questions.map((qq) => (
                <div key={qq.id}>
                  <p className="text-sm font-semibold">{qq.es}</p>
                  <p className="text-xs text-muted-foreground">{qq.en}</p>
                  {qq.type === "choice" ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {qq.options!.map((o) => (
                        <button type="button" key={o} onClick={() => setAnswers((a) => ({ ...a, [qq.id]: o }))} className={cn("rounded-full border px-3 py-1 text-xs", answers[qq.id] === o ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{o}</button>
                      ))}
                    </div>
                  ) : (
                    <Input className="mt-1" type={qq.type === "number" ? "number" : "text"} inputMode={qq.type === "number" ? "numeric" : undefined} min={0} value={answers[qq.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [qq.id]: e.target.value }))} maxLength={200} />
                  )}
                </div>
              ))}
            </fieldset>
          ))}
          <Button type="submit" className="h-12 w-full"><Save /> Guardar encuesta en cola offline</Button>
        </form>
      </div>
    );
  }

  async function sync() {
    if (syncing) return;
    if (!queue.length) { toast("Nada pendiente"); return; }
    const registered = queue.filter((u) => households.some((h) => h.id === u.householdId));
    const pending = queue.length - registered.length;
    const done = new Set<string>();

    // Sample entries keep the old local-only behavior and never touch the database.
    for (const u of registered.filter((x) => x.demo)) {
      const real = u.items.filter((i) => i !== "Alerta Derrumbe");
      const usd = real.reduce((s, i) => s + (SUPPLIES.find((x) => x.key === i)?.usd ?? 0), 0);
      if (real.length) deliver(u.householdId, real, usd, "Entrega de campo (minga)", `CAMPO-${u.id.slice(-4)}`);
      done.add(u.id);
    }

    // Real entries become needs in the database (needs the coordinator sign-in).
    const live = registered.filter((x) => !x.demo);
    let synced = 0;
    if (live.length) {
      setSyncing(true);
      try {
        const results = await syncFn({ data: { updates: live.map((u) => ({ id: u.id, householdId: u.householdId, items: u.items, photo: u.photo, at: u.at, survey: u.survey ?? {} })) } });
        for (const r of results) { if (r.ok) { done.add(r.id); synced++; } }
        const failed = results.filter((r) => !r.ok);
        if (failed.length) toast.error(`${failed.length} sin sincronizar: ${failed[0]?.message ?? "error"}`);
        if (synced) refreshLedger();
      } catch {
        toast.error("No se pudo sincronizar. Revise la conexión e inicio de sesión; las actualizaciones siguen en la cola.");
      } finally { setSyncing(false); }
    }

    setQueue((q) => q.filter((u) => !done.has(u.id)));
    const total = done.size;
    if (total) toast.success(`${total} actualizaciones sincronizadas${synced ? ` (${synced} guardadas en la base de datos)` : " al tablero (demo)"}`);
    if (pending) toast.info(`${pending} pendientes: el coordinador debe registrar los nuevos IDs antes de sincronizar.`);
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[2.5rem] border-8 border-foreground bg-background p-4 shadow-card">
      <div className="mx-auto mb-3 h-1.5 w-24 rounded-full bg-foreground/80" />
      <div className="flex items-start gap-2 rounded-xl bg-primary p-3 text-sm text-primary-foreground">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p><b>OFFLINE MODE READY:</b> {queue.length} Household Updates Saved Locally — Auto-syncs when signal returns</p>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Apellidos visibles solo para la cuadrilla — nunca en el tablero público</p>

      <label htmlFor="field-household-id" className="mt-3 block text-sm font-semibold">ID del hogar · Apellido</label>
      <select id="field-household-id" value={hid} onChange={(e) => setHid(e.target.value)} className="mt-1 w-full rounded-lg border bg-card p-3 text-base">
        {ids.map((id) => <option key={id} value={id}>{label(id)}</option>)}
      </select>

      <section className="mt-4 border-y py-3">
        <label htmlFor="new-household-id" className="block text-sm font-semibold">¿El ID del hogar no está listado?</label>
        <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); addId(); }}>
          <Input id="new-household-id" value={newId} onChange={(event) => { setNewId(event.target.value); setIdError(null); }} placeholder="HH_09" aria-invalid={Boolean(idError)} aria-describedby={idError ? "household-id-error" : "household-id-note"} autoComplete="off" spellCheck={false} maxLength={12} className="min-w-0 flex-1" />
          <Input aria-label="Apellido de la familia" value={newSurname} onChange={(event) => { setNewSurname(event.target.value); setIdError(null); }} placeholder="Apellido" autoComplete="off" maxLength={40} className="min-w-0 flex-1" />
          <Button type="submit" variant="outline" aria-label="Añadir ID de hogar"><Plus className="h-4 w-4" /> Añadir</Button>
        </form>
        {idError && <p id="household-id-error" role="alert" className="mt-2 text-xs text-destructive">{idError}</p>}
        <p id="household-id-note" className="mt-2 text-xs text-muted-foreground">Código como HH_09 y, si quiere, solo el apellido. Sin teléfonos ni direcciones. Los IDs añadidos duran esta sesión.</p>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {SUPPLIES.map((s) => (
          <button key={s.key} onClick={() => toggle(s.key)} className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-sm font-semibold transition", items.includes(s.key) ? (s.key === "Alerta Derrumbe" ? "border-accent bg-accent text-accent-foreground" : "border-primary bg-primary text-primary-foreground") : "bg-card")}>
            <span className="text-3xl">{s.icon}</span>{s.key}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <Button variant={photo ? "default" : "outline"} className="h-12 w-full" onClick={() => setPhoto(true)}>
          <Camera /> {photo ? "Foto + GPS ✔ 4.3339° N, 75.7039° W" : "Capture Photo + Stamp GPS (4.3339° N, 75.7039° W)"}
        </Button>
        <Button className="h-12 w-full" onClick={startSurvey}><ClipboardList /> Continuar a la encuesta ({items.length})</Button>
        <Button variant="secondary" className="h-12 w-full" onClick={sync} disabled={syncing}><Wifi /> {syncing ? "Syncing…" : "Simulate Signal Return & Sync Now"}</Button>
      </div>

      {queue.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {queue.map((u) => <li key={u.id} className="break-words">⏳ {u.at} · {label(u.householdId)} · {u.items.join(", ")}{u.photo ? " · 📷" : ""}</li>)}
        </ul>
      )}
    </div>
  );
}
