"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABEL, type ReportSummary, type Role } from "@/lib/types";
import ReportDetail from "./ReportDetail";
import { StatusBadge, api, formatDate } from "./ui";

export default function ReportBrowser({ role, refreshKey = 0 }: { role: Role; refreshKey?: number }) {
  const [items, setItems] = useState<ReportSummary[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const isStaff = role !== "warga";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const d = await api<{ reports: ReportSummary[] }>(`/api/reports?${params.toString()}`);
      setItems(d.reports);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, 250); // jeda singkat saat mengetik pencarian
    return () => clearTimeout(t);
  }, [load, refreshKey, tick]);

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nomor tiket atau judul"
          aria-label="Cari laporan"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="split">
        <div className="list">
          {loading && items.length === 0 && <div className="empty">Memuat laporan...</div>}
          {!loading && items.length === 0 && !error && (
            <div className="empty">
              {role === "warga" ? "Belum ada laporan. Buat pengaduan pertama Anda." : "Belum ada laporan yang cocok."}
            </div>
          )}
          {items.map((r) => (
            <button
              key={r.id}
              className="item"
              aria-current={selected === r.id}
              onClick={() => setSelected(r.id)}
            >
              <div className="meta">
                <span>{r.ticket_no}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="title">{r.title}</div>
              <div className="sub">
                {r.category_name} &middot; {formatDate(r.created_at)}
                {isStaff && ` · ${r.reporter_name ?? "Anonim"}`}
              </div>
            </button>
          ))}
        </div>

        <div>
          {selected ? (
            <ReportDetail id={selected} role={role} onChanged={() => setTick((n) => n + 1)} />
          ) : (
            <div className="empty">Pilih laporan di sebelah kiri untuk melihat detail dan riwayat status.</div>
          )}
        </div>
      </div>
    </div>
  );
}
