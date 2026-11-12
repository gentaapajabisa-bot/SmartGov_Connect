"use client";

import "leaflet/dist/leaflet.css";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456]; // Jakarta; hanya titik awal peta
const round6 = (n: number) => Number(n.toFixed(6));

// Peta untuk memilih lokasi: klik peta untuk menaruh penanda. `value` dapat diubah dari luar
// (misalnya tombol "Gunakan lokasi saya"), dan peta akan memusatkan diri ke titik itu.
export default function MapPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const fromClick = useRef(false);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [ready, setReady] = useState(false);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !box.current) return;
      leafletRef.current = L;
      const start = valueRef.current;
      const map = L.map(box.current, { zoomControl: true }).setView(start ? [start.lat, start.lng] : DEFAULT_CENTER, start ? 17 : 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      map.on("click", (e) => {
        const p = e.latlng.wrap();
        fromClick.current = true;
        onChangeRef.current({ lat: round6(p.lat), lng: round6(p.lng) });
      });
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
  }, []);

  // Sinkronkan penanda dengan nilai yang dipilih.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const pos: [number, number] = [value.lat, value.lng];
    if (markerRef.current) markerRef.current.setLatLng(pos);
    else {
      markerRef.current = L.circleMarker(pos, {
        radius: 9,
        color: "#22d3ee",
        weight: 3,
        fillColor: "#04101f",
        fillOpacity: 1,
      }).addTo(map);
    }
    if (!fromClick.current) map.setView(pos, Math.max(map.getZoom(), 17));
    fromClick.current = false;
  }, [value, ready]);

  return (
    <div>
      <div ref={box} className="map-box" role="application" aria-label="Peta pemilihan lokasi" />
      <span className="hint">
        {value ? `Titik dipilih: ${value.lat}, ${value.lng}. Klik peta untuk memindahkan.` : "Klik peta untuk menandai lokasi kejadian."}
      </span>
    </div>
  );
}
