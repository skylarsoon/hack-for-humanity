import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CENTER, HAZARD, formatMoney, type Currency, type Household } from "@/lib/nido-data";

const COLORS = { needs: "#c0392b", progress: "#e0a800", delivered: "#2e8b57" };

export default function PijaoMap({ households, currency }: { households: Household[]; currency: Currency }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView([CENTER.lat, CENTER.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(m);
    L.marker([HAZARD.lat, HAZARD.lng], { icon: L.divIcon({ className: "hazard-marker", html: "<div></div>", iconSize: [22, 22] }) })
      .addTo(m)
      .bindPopup("<b>⚠️ El Filo Ridge Trail → Resguardo Ibanacuara</b><br/>SOIL & LANDSLIDE RISK: Construction and heavy material transport paused; retention engineering needed.");
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    households.forEach((h) => {
      const proof = h.status === "delivered"
        ? `<div style="margin-top:6px"><b>Entregado:</b> ${h.delivered.join(", ")}<br/><b>Costo:</b> ${formatMoney(h.costUsd, currency)}<br/><span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:99px;background:#2e8b57;color:#fff;font-size:11px">✔ Signed Acta Verified</span></div>`
        : `<div style="margin-top:6px"><b>Necesita:</b> ${h.needs.join(", ") || "—"}</div>`;
      L.circleMarker([h.lat, h.lng], { radius: 10, color: "#fff", weight: 2, fillColor: COLORS[h.status], fillOpacity: 0.95 })
        .bindPopup(`<b>${h.id}</b><br/>${h.vereda} · ${h.community}${proof}`)
        .addTo(g);
    });
  }, [households, currency]);

  return <div ref={el} className="h-full min-h-[440px] w-full rounded-xl" />;
}
