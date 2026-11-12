"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABEL, type MapPoint, type Role } from "@/lib/types";
import MapView, { STATUS_COLOR } from "./MapView";
import ReportDetail from "./ReportDetail";
import { api } from "./ui";

// Tab "Peta" untuk staf: sebaran laporan + detail laporan yang dipilih di bawahnya.
export default function ReportMap({ role, userId = 0 }: { role: Role; userId?: number }) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await api<{ points: MapPoint[] }>(`/api/reports/map${onlyOpen ? "?open=1" : ""}`);
      setPoints(d.points);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onlyOpen]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="toolbar" style={{ alignItems: "center" }}>
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          <span>Hanya laporan yang masih berjalan</span>
        </label>
        <span className="hint" style={{ marginLeft: "auto" }}>
          {loading ? "Memuat..." : `${points.length} laporan berkoordinat`}
        </span>
      </div>

      <div className="legend" aria-label="Keterangan warna status">
        {STATUSES.map((s) => (
          <span key={s}>
            <i style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <MapView points={points} selectedId={selected} onSelect={setSelected} />
      {!loading && points.length === 0 && !error && (
        <div className="empty" style={{ marginTop: 12 }}>
          Belum ada laporan dengan koordinat. Warga menandai lokasi lewat peta saat membuat pengaduan.
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {selected ? (
          <ReportDetail id={selected} role={role} userId={userId} onChanged={load} />
        ) : (
          points.length > 0 && <div className="empty">Klik sebuah penanda di peta untuk melihat detail laporan.</div>
        )}
      </div>
    </div>
  );
}
