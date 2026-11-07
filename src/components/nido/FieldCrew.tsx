import { useState } from "react";
import { Camera, Save, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useNido } from "@/lib/nido-store";
import { SUPPLIES } from "@/lib/nido-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FieldCrew() {
  const { households, queue, setQueue, deliver } = useNido();
  const [hid, setHid] = useState(households[0]?.id ?? "");
  const [items, setItems] = useState<string[]>([]);
  const [photo, setPhoto] = useState(false);

  const toggle = (k: string) => setItems((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  function save() {
    if (!items.length) { toast.error("Toque al menos un ícono"); return; }
    setQueue((q) => [...q, { id: `q${Date.now()}`, householdId: hid, items, photo, at: new Date().toTimeString().slice(0, 5) }]);
    setItems([]); setPhoto(false);
    toast.success("Guardado sin señal ✔");
  }

  function sync() {
    if (!queue.length) { toast("Nada pendiente"); return; }
    queue.forEach((u) => {
      const real = u.items.filter((i) => i !== "Alerta Derrumbe");
      const usd = real.reduce((s, i) => s + (SUPPLIES.find((x) => x.key === i)?.usd ?? 0), 0);
      if (real.length) deliver(u.householdId, real, usd, "Entrega de campo (minga)", `CAMPO-${u.id.slice(-4)}`);
    });
    toast.success(`${queue.length} actualizaciones sincronizadas al tablero`);
    setQueue([]);
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[2.5rem] border-8 border-foreground bg-background p-4 shadow-card">
      <div className="mx-auto mb-3 h-1.5 w-24 rounded-full bg-foreground/80" />
      <div className="flex items-start gap-2 rounded-xl bg-primary p-3 text-sm text-primary-foreground">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p><b>OFFLINE MODE READY:</b> {queue.length} Household Updates Saved Locally — Auto-syncs when signal returns</p>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">En español, un toque por familia</p>

      <label className="mt-3 block text-sm font-semibold">Familia</label>
      <select value={hid} onChange={(e) => setHid(e.target.value)} className="mt-1 w-full rounded-lg border bg-card p-3 text-base">
        {households.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.vereda}</option>)}
      </select>

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
        <Button className="h-12 w-full" onClick={save}><Save /> Save to Offline Queue</Button>
        <Button variant="secondary" className="h-12 w-full" onClick={sync}><Wifi /> Simulate Signal Return & Sync Now</Button>
      </div>

      {queue.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {queue.map((u) => <li key={u.id}>⏳ {u.at} · {households.find((h) => h.id === u.householdId)?.name} · {u.items.join(", ")}{u.photo ? " · 📷" : ""}</li>)}
        </ul>
      )}
    </div>
  );
}
