import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CENTER, formatMoney, type Currency } from "@/lib/nido-data";
import { REGIONS, regionProgress } from "@/lib/donor-impact";

export default function RegionMap({ spent, currency, es }: { spent: Record<string, number>; currency: Currency; es: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([CENTER.lat, CENTER.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    REGIONS.forEach((r) => {
      const got = spent[r.vereda] ?? 0;
      const pct = regionProgress(got, r.needUsd);
      const color = pct >= 75 ? "#2e8b57" : pct >= 35 ? "#e0a800" : "#c0392b";
      L.circle(r.center, { radius: r.radiusM, color, weight: 2, fillColor: color, fillOpacity: 0.25 })
        .bindTooltip(`${r.vereda} · ${pct}%`, { permanent: true, direction: "center" })
        .bindPopup(`<b>${r.vereda}</b><br/>${es ? "Recibido" : "Received"}: ${formatMoney(got, currency)}<br/>${es ? "Necesita para recuperarse (est.)" : "Needed to fully recover (est.)"}: ${formatMoney(r.needUsd, currency)}<br/>${es ? "Falta" : "Still needed"}: ${formatMoney(Math.max(0, r.needUsd - got), currency)}`)
        .addTo(g);
    });
  }, [spent, currency, es]);

  return <div ref={el} className="h-[380px] w-full rounded-xl" />;
}
