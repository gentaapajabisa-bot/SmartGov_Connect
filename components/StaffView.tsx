"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABEL, type ReportSummary, type Stats } from "@/lib/types";
import ReportBrowser from "./ReportBrowser";
import ReportDetail from "./ReportDetail";
import ReportMap from "./ReportMap";
import SidebarShell, { type NavItem } from "./SidebarShell";
import { StatusBadge, api, formatDate } from "./ui";

type Tab = "overview" | "queue" | "mine" | "map";

const ICONS = {
  grid: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  inbox: <svg viewBox="0 0 24 24"><path d="M4 4h16v11h-4l-2 3h-4l-2-3H4z" /></svg>,
  check: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>,
  map: <svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /></svg>,
};

export default function StaffView({ userId, userName }: { userId: number; userName: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [repRes, statRes] = await Promise.all([
        api<{ reports: ReportSummary[] }>("/api/reports"),
        api<{ stats: Stats }>("/api/admin/stats?days=14"),
      ]);
      setReports(repRes.reports);
      setStats(statRes.stats);
    } catch {
      // abaikan
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCount = reports.length;
  const newCount = reports.filter((r) => r.status === "baru").length;
  const progressCount = reports.filter((r) => r.status === "diverifikasi" || r.status === "diproses").length;
  const doneCount = reports.filter((r) => r.status === "selesai").length;

  const filtered = reports.filter((r) => {
    if (tab === "mine" && r.assigned_to !== userId) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return r.ticket_no.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.location_text.toLowerCase().includes(q);
    }
    return true;
  });

  const navItems: NavItem[] = [
    { id: "overview", label: "Ringkasan", icon: ICONS.grid },
    { id: "queue", label: "Semua Pengaduan", icon: ICONS.inbox, badge: newCount },
    { id: "mine", label: "Tugas Saya", icon: ICONS.check },
    { id: "map", label: "Peta Sebaran", icon: ICONS.map },
  ];

  const maxDaily = Math.max(1, ...(stats?.daily.map((d) => d.n) ?? [1]));

  return (
    <SidebarShell
      title="Dashboard Petugas"
      subtitle="Kelola antrean pengaduan anonim dari warga, perbarui status, dan unggah bukti penyelesaian."
      navItems={navItems}
      activeId={tab}
      onSelect={(id) => {
        setTab(id as Tab);
        setSelectedId(null);
      }}
      footerCaption="Pelayanan responsif untuk warga"
      user={{ name: userName, roleLabel: "Petugas Kelurahan" }}
    >
      {tab === "overview" && (
        <>
          {/* 4 Kartu KPI seperti gambar */}
          <div className="sgc-kpi-grid-4">
            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon blue">
                <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h6" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-label">Total Pengaduan</div>
                <div className="sgc-kpi-num">{totalCount}</div>
              </div>
            </div>

            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon red">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-label">Baru Masuk</div>
                <div className="sgc-kpi-num">{newCount}</div>
              </div>
            </div>

            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon amber">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-label">Diproses</div>
                <div className="sgc-kpi-num">{progressCount}</div>
              </div>
            </div>

            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon green">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-label">Selesai</div>
                <div className="sgc-kpi-num">{doneCount}</div>
              </div>
            </div>
          </div>

          {/* Grafik Tren Pengaduan Harian */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Tren Pengaduan Masuk (14 Hari Terakhir)</h3>
              <span className="hint">Anonim & Real-time</span>
            </div>
            {!stats || stats.daily.length === 0 ? (
              <div className="empty">Belum ada data grafik harian.</div>
            ) : (
              <div className="daily" role="img" aria-label="Grafik tren pengaduan harian">
                {stats.daily.map((d) => (
                  <div className="col" key={d.date} title={`${d.date}: ${d.n} laporan`}>
                    <span>{d.n}</span>
                    <span className="fill" style={{ height: `${Math.max(6, (d.n / maxDaily) * 85)}px` }} />
                    <span>{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabel Antrean Pengaduan Masuk */}
          <div className="card">
            <div className="toolbar" style={{ alignItems: "center" }}>
              <h3 style={{ margin: 0, marginRight: "auto" }}>Antrean Pengaduan Masuk</h3>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Cari kode tiket / judul..."
                style={{ maxWidth: 240 }}
              />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter status">
                <option value="">Semua Status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID / Kode</th>
                    <th>Judul & Lokasi</th>
                    <th>Kategori</th>
                    <th>Pelapor</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                        Tidak ada pengaduan yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, 20).map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>#{r.ticket_no}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.title}</div>
                          <div className="hint">{r.location_text}</div>
                        </td>
                        <td><span className="sgc-cat-pill">{r.category_name}</span></td>
                        <td><span className="hint">Warga Anonim</span></td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="hint">{formatDate(r.created_at)}</td>
                        <td>
                          <button type="button" className="btn btn-light btn-sm" onClick={() => setSelectedId(r.id)}>
                            Proses / Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedId && (
            <div style={{ marginTop: 18 }}>
              <ReportDetail
                id={selectedId}
                role="petugas"
                userId={userId}
                onChanged={loadData}
              />
            </div>
          )}
        </>
      )}

      {tab === "queue" && <ReportBrowser role="petugas" userId={userId} />}
      {tab === "mine" && <ReportBrowser role="petugas" userId={userId} />}
      {tab === "map" && <ReportMap role="petugas" userId={userId} />}
    </SidebarShell>
  );
}
