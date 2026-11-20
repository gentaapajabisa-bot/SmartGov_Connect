"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABEL, type Category, type ReportSummary, type Role } from "@/lib/types";
import ReportDetail from "./ReportDetail";
import { SlaBadge, StatusBadge, api, formatDate } from "./ui";

export default function ReportBrowser({
  role,
  userId = 0,
  refreshKey = 0,
}: {
  role: Role;
  userId?: number;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<ReportSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assigned, setAssigned] = useState("");
  const [sla, setSla] = useState("");
  const [sort, setSort] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const isStaff = role === "petugas" || role === "admin";

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (categoryId) params.set("category_id", categoryId);
      if (isStaff && assigned) params.set("assigned", assigned);
      if (isStaff && sla === "late") params.set("overdue", "1");
      if (isStaff && sort) params.set("sort", sort);
      if (q.trim()) params.set("q", q.trim());
      const d = await api<{ reports: ReportSummary[] }>(`/api/reports?${params.toString()}`);
      setItems(d.reports);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, categoryId, assigned, sla, sort, q, isStaff]);

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
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter kategori">
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {isStaff && (
          <select value={assigned} onChange={(e) => setAssigned(e.target.value)} aria-label="Filter penugasan">
            <option value="">Semua penugasan</option>
            <option value="me">Ditugaskan ke saya</option>
            <option value="none">Belum ditugaskan</option>
          </select>
        )}
        {isStaff && (
          <select value={sla} onChange={(e) => setSla(e.target.value)} aria-label="Filter SLA">
            <option value="">Semua SLA</option>
            <option value="late">Terlambat</option>
          </select>
        )}
        {isStaff && (
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutan">
            <option value="">Terbaru</option>
            <option value="votes">Dukungan terbanyak</option>
            <option value="due">Batas SLA terdekat</option>
          </select>
        )}
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="split">
        <div className="list">
          {loading && items.length === 0 && <div className="empty">Memuat laporan...</div>}
          {!loading && items.length === 0 && !error && (
            <div className="empty">
             role: "warga" | "petugas" | "admin";
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
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {r.votes > 0 && <span className="votes" title="Dukungan warga">▲ {r.votes}</span>}
                  <SlaBadge status={r.status} due_at={r.due_at} overdue={r.overdue} />
                  <StatusBadge status={r.status} />
                </span>
              </div>
              <div className="title">{r.title}</div>
              <div className="sub">
                {r.category_name} &middot; {formatDate(r.created_at)}
                {isStaff && ` · ${r.reporter_name ?? "Anonim"}`}
                {isStaff && ` · ${r.assigned_name ? `Petugas: ${r.assigned_name}` : "Belum ditugaskan"}`}
              </div>
            </button>
          ))}
        </div>

        <div>
          {selected ? (
            <ReportDetail id={selected} role={role} userId={userId} onChanged={() => setTick((n) => n + 1)} />
          ) : (
            <div className="empty">Pilih laporan di sebelah kiri untuk melihat detail dan riwayat status.</div>
          )}
        </div>
      </div>
    </div>
  );
}
