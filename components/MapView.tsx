"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { STATUS_LABEL, type MapPoint, type Status } from "@/lib/types";

export const STATUS_COLOR: Record<Status, string> = {
  baru: "#60a5fa",
  diverifikasi: "#fbbf24",
  diproses: "#22d3ee",
  selesai: "#34d399",
  ditolak: "#f87171",
};

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

// Peta sebaran laporan (staf). Satu penanda per laporan, diwarnai menurut status.
export default function MapView({
  points,
  selectedId,
  onSelect,
}: {
  points: MapPoint[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const fitted = useRef(false);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !box.current) return;
      leafletRef.current = L;
      const map = L.map(box.current).setView(DEFAULT_CENTER, 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      fitted.current = false;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    for (const p of points) {
      const sel = p.id === selectedId;
      const m = L.circleMarker([p.latitude, p.longitude], {
        radius: sel ? 11 : 7,
        color: sel ? "#ffffff" : STATUS_COLOR[p.status],
        weight: sel ? 3 : 2,
        fillColor: STATUS_COLOR[p.status],
        fillOpacity: 0.85,
      });
      // Teks tooltip dibuat sebagai node DOM (textContent) agar judul laporan tidak pernah dianggap HTML.
      const tip = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = p.ticket_no;
      tip.append(strong, document.createElement("br"), document.createTextNode(`${p.title} · ${STATUS_LABEL[p.status]}`));
      m.bindTooltip(tip);
      m.on("click", () => onSelectRef.current(p.id));
      m.addTo(layer);
    }
    if (!fitted.current && points.length > 0) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])), { padding: [40, 40], maxZoom: 16 });
      fitted.current = true;
    }
  }, [points, selectedId, ready]);

  return <div ref={box} className="map-box map-box-lg" role="application" aria-label="Peta sebaran laporan" />;
}
