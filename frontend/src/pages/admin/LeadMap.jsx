import { useEffect, useRef, useState } from "react";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    let s = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (s) { s.addEventListener("load", () => resolve(window.L)); return; }
    s = document.createElement("script");
    s.src = LEAFLET_JS; s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function LeadMap() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const mapEl = useRef(null);
  const mapObj = useRef(null);

  useEffect(() => {
    if (open && !data) api.get("/admin/leads/geo").then(({ data }) => setData(data)).catch(() => setData({ points: [], countries: [] }));
  }, [open, data]);

  useEffect(() => {
    if (!open || !data || !mapEl.current) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapEl.current) return;
      if (!mapObj.current) {
        mapObj.current = L.map(mapEl.current, { worldCopyJump: true, scrollWheelZoom: false }).setView([20, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(mapObj.current);
      }
      const layer = L.layerGroup().addTo(mapObj.current);
      const pts = [];
      (data.points || []).forEach((p) => {
        const lat = Number(p.geo_lat), lon = Number(p.geo_lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          pts.push([lat, lon]);
          L.circleMarker([lat, lon], { radius: 7, color: "#0055FF", fillColor: "#0055FF", fillOpacity: 0.6, weight: 2 })
            .bindPopup(`<b>${p.name || "Lead"}</b><br/>${p.service || ""}<br/>${[p.geo_city, p.geo_country].filter(Boolean).join(", ")}`)
            .addTo(layer);
        }
      });
      if (pts.length) mapObj.current.fitBounds(pts, { padding: [40, 40], maxZoom: 6 });
      setTimeout(() => mapObj.current && mapObj.current.invalidateSize(), 200);
      return () => layer.remove();
    });
    return () => { cancelled = true; };
  }, [open, data]);

  return (
    <div data-testid="lead-map" className="mt-8 rounded-2xl border border-line bg-white p-6">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" data-testid="lead-map-toggle">
        <span className="flex items-center gap-2 font-heading font-bold"><MapPin className="h-4 w-4 text-brand" /> Where your leads come from</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-6">
          {!data ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_260px] gap-6">
              <div ref={mapEl} data-testid="lead-map-canvas" className="h-[420px] w-full rounded-xl overflow-hidden border border-line bg-paper z-0" />
              <div>
                <p className="text-sm font-heading font-bold">Top countries</p>
                {data.countries.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No located leads yet. New enquiries are mapped automatically.</p>
                ) : (
                  <ul className="mt-3 space-y-2" data-testid="lead-countries">
                    {data.countries.slice(0, 12).map((c) => (
                      <li key={c.country} className="flex items-center justify-between text-sm">
                        <span className="truncate">{c.country}</span>
                        <span className="font-mono text-xs text-brand">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
