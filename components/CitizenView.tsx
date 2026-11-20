"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSavedDeviceReports, saveDeviceReport } from "@/lib/deviceReports";
import { STATUS_LABEL, type ReportDetailData, type ReportSummary } from "@/lib/types";
import ReportDetail from "./ReportDetail";
import ReportForm from "./ReportForm";
import SidebarShell, { type NavItem } from "./SidebarShell";
import { SlaBadge, Stars, StatusBadge, api, formatDate } from "./ui";

type Tab = "home" | "new" | "mine" | "track";

const ICONS = {
  home: <svg viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  plus: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>,
  list: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>,
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
};

export default function CitizenView() {
  const [tab, setTab] = useState<Tab>("home");
  const [myReports, setMyReports] = useState<ReportSummary[]>([]);
  const [publicReports, setPublicReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // State pelacakan kode tiket
  const [trackCode, setTrackCode] = useState("");
  const [trackedReport, setTrackedReport] = useState<ReportDetailData | null>(null);
  const [trackError, setTrackError] = useState("");
  const [trackBusy, setTrackBusy] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const saved = getSavedDeviceReports();
      const tickets = saved.map((s) => s.ticket_no).join(",");
      const [mineRes, pubRes] = await Promise.all([
        tickets ? api<{ reports: ReportSummary[] }>(`/api/reports?tickets=${encodeURIComponent(tickets)}`) : Promise.resolve({ reports: [] }),
        api<{ reports: ReportSummary[] }>("/api/reports?public=1"),
      ]);
      setMyReports(mineRes.reports);
      setPublicReports(pubRes.reports);
    } catch {
      // tetap tampilkan halaman meski belum ada data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleTrack(e: FormEvent) {
    e.preventDefault();
    const code = trackCode.trim().toUpperCase().replace(/^#/, "");
    if (!code) return;
    setTrackError("");
    setTrackedReport(null);
    setTrackBusy(true);
    try {
      const d = await api<{ report: ReportDetailData }>(`/api/reports/track?ticket=${encodeURIComponent(code)}`);
      setTrackedReport(d.report);
      // Simpan ke daftar riwayat perangkat jika belum ada (tanpa token pemilik)
      saveDeviceReport({
        id: d.report.id,
        ticket_no: d.report.ticket_no,
        device_token: "",
        title: d.report.title,
        created_at: d.report.created_at,
      });
      loadReports();
    } catch (err) {
      setTrackError((err as Error).message);
    } finally {
      setTrackBusy(false);
    }
  }

  const navItems: NavItem[] = [
    { id: "home", label: "Dashboard", icon: ICONS.home },
    { id: "new", label: "Buat Pengaduan", icon: ICONS.plus },
    { id: "mine", label: "Pengaduan Saya", icon: ICONS.list, badge: myReports.length },
    { id: "track", label: "Lacak Kode", icon: ICONS.search },
  ];

  const totalCount = myReports.length;
  const activeCount = myReports.filter((r) => ["baru", "diverifikasi", "diproses"].includes(r.status)).length;
  const doneCount = myReports.filter((r) => r.status === "selesai").length;
  const displayList = myReports.length > 0 ? myReports : publicReports;

  return (
    <SidebarShell
      title="Portal Layanan Warga"
      subtitle="Sampaikan aspirasi atau pengaduan Anda secara anonim dan pantau progres secara real-time."
      navItems={navItems}
      activeId={tab}
      onSelect={(id) => {
        setTab(id as Tab);
        setSelectedId(null);
      }}
      footerCaption="Suara Anda membangun kota kita"
      user={null}
    >
      {tab === "home" && (
        <>
          {/* Hero Banner Biru Gradient */}
          <div className="sgc-hero-banner">
            <div>
              <h2>Ada Masalah Infrastruktur atau Layanan?</h2>
              <p>
                Laporkan masalah dengan cepat tanpa perlu login dan tanpa meninggalkan identitas pribadi. Dapatkan kode pelacakan unik secara instan.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="sgc-banner-btn" onClick={() => setTab("new")}>
                  + Buat Pengaduan Baru
                </button>
                <button type="button" className="sgc-banner-btn-ghost" onClick={() => setTab("track")}>
                  Lacak Kode Tiket
                </button>
              </div>
            </div>
            <div className="sgc-banner-art" aria-hidden="true">
              <svg viewBox="0 0 120 120" width="96" height="96">
                <circle cx="60" cy="60" r="52" fill="rgba(255,255,255,0.12)" />
                <path d="M36 62l16 16 32-34" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* 3 Kartu KPI */}
          <div className="sgc-kpi-grid">
            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon blue">
                <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h6" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-num">{totalCount}</div>
                <div className="sgc-kpi-label">Pengaduan di Perangkat Ini</div>
              </div>
            </div>

            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon amber">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-num">{activeCount}</div>
                <div className="sgc-kpi-label">Sedang Diproses</div>
              </div>
            </div>

            <div className="sgc-kpi-card">
              <div className="sgc-kpi-icon green">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
              </div>
              <div>
                <div className="sgc-kpi-num">{doneCount}</div>
                <div className="sgc-kpi-label">Selesai</div>
              </div>
            </div>
          </div>

          {/* Grid Utama: Daftar Pengaduan (Kiri) + Widget Lacak Kode & Bantuan (Kanan) */}
          <div className="sgc-dash-grid">
            <div>
              <div className="sgc-section-bar">
                <h3>{myReports.length > 0 ? "Pengaduan Terbaru Saya" : "Pengaduan Publik Terbaru"}</h3>
                <button type="button" className="sgc-link-btn" onClick={() => setTab("mine")}>
                  Lihat Semua &rarr;
                </button>
              </div>

              {loading && displayList.length === 0 && <div className="empty">Memuat pengaduan...</div>}
              {!loading && displayList.length === 0 && (
                <div className="empty">Belum ada pengaduan. Klik &ldquo;Buat Pengaduan Baru&rdquo; untuk memulai.</div>
              )}

              <div className="sgc-report-cards">
                {displayList.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="sgc-report-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedId(r.id);
                      setTab("mine");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedId(r.id);
                        setTab("mine");
                      }
                    }}
                  >
                    <div className="sgc-report-thumb">
                      {r.first_photo_id ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/reports/${r.id}/photos/${r.first_photo_id}`} alt={r.title} />
                      ) : (
                        <div className="sgc-thumb-placeholder">
                          <svg viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
                        </div>
                      )}
                    </div>

                    <div className="sgc-report-body">
                      <div className="sgc-report-top">
                        <span className="sgc-ticket">#{r.ticket_no}</span>
                        <span className="sgc-cat-pill">{r.category_name}</span>
                      </div>
                      <div className="sgc-report-title">{r.title}</div>
                      <div className="sgc-report-meta">
                        <span>📍 {r.location_text}</span>
                        <span>🕒 {formatDate(r.created_at)}</span>
                      </div>
                      {r.status === "selesai" && r.rating_stars && (
                        <div style={{ marginTop: 6 }}>
                          <Stars value={r.rating_stars} size="0.88rem" />
                        </div>
                      )}
                    </div>

                    <div className="sgc-report-side">
                      <StatusBadge status={r.status} />
                      <SlaBadge status={r.status} due_at={r.due_at} overdue={r.overdue} />
                      {r.status === "selesai" && !r.rating_stars && (
                        <span className="sgc-rate-tag">Beri Rating</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kolom Kanan: Widget Lacak Kode + Card Bantuan */}
            <div style={{ display: "grid", gap: 18 }}>
              <form onSubmit={handleTrack} className="card">
                <h3 style={{ marginBottom: 4 }}>Lacak Status Kode</h3>
                <p className="hint" style={{ marginBottom: 12 }}>
                  Masukkan kode pengaduan untuk melacak status tanpa login.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value)}
                    placeholder="Contoh: SGC-20261120-XXXXXX"
                    aria-label="Kode tiket pengaduan"
                  />
                  <button className="btn btn-sm" type="submit" disabled={trackBusy} aria-label="Cari tiket">
                    🔍
                  </button>
                </div>
                {trackError && <div className="alert alert-error" style={{ marginTop: 10, marginBottom: 0 }}>{trackError}</div>}
                {trackedReport && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid var(--line-strong)", background: "rgba(37,99,235,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <strong>#{trackedReport.ticket_no}</strong>
                      <StatusBadge status={trackedReport.status} />
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{trackedReport.title}</div>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      style={{ marginTop: 8, width: "100%" }}
                      onClick={() => setTab("track")}
                    >
                      Buka Detail & Riwayat Lengkap
                    </button>
                  </div>
                )}
              </form>

              <div className="sgc-help-card">
                <div className="sgc-help-badge">Jaminan Privasi</div>
                <h3>Butuh Bantuan?</h3>
                <p>
                  Pengaduan Anda sepenuhnya anonim. Simpan kode tiket agar dapat memantau tindak lanjut petugas dan memberi penilaian kepuasan.
                </p>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setTab("new")}>
                  Kirim Pengaduan Sekarang
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "new" && (
        <div style={{ maxWidth: 680 }}>
          <ReportForm
            onCreated={() => {
              loadReports();
            }}
          />
        </div>
      )}

      {tab === "mine" && (
        <div className="split">
          <div className="list">
            {myReports.length === 0 ? (
              <div className="empty">
                Belum ada pengaduan yang tersimpan di perangkat ini. Gunakan menu &ldquo;Lacak Kode&rdquo; bila Anda memiliki nomor tiket dari perangkat lain.
              </div>
            ) : (
              myReports.map((r) => (
                <button
                  key={r.id}
                  className="item"
                  aria-current={selectedId === r.id}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="meta">
                    <span>#{r.ticket_no}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="title">{r.title}</div>
                  <div className="sub">
                    {r.category_name} &middot; {STATUS_LABEL[r.status]} &middot; {formatDate(r.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>
          <div>
            {selectedId ? (
              <ReportDetail id={selectedId} role="warga" onChanged={loadReports} />
            ) : (
              <div className="empty">Pilih salah satu pengaduan di sebelah kiri untuk melihat detail, bukti penyelesaian, dan memberi penilaian.</div>
            )}
          </div>
        </div>
      )}

      {tab === "track" && (
        <div style={{ maxWidth: 720 }}>
          <form onSubmit={handleTrack} className="card" style={{ marginBottom: 18 }}>
            <h3>Lacak Pengaduan dengan Kode Tiket</h3>
            <p className="hint">Masukkan nomor tiket unik (misalnya <code>SGC-20261120-XXXXXX</code>) untuk memeriksa progres penanganan.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                placeholder="SGC-YYYYMMDD-XXXXXX"
                style={{ flex: "1 1 260px" }}
              />
              <button className="btn" type="submit" disabled={trackBusy}>
                {trackBusy ? "Mencari..." : "Lacak Pengaduan"}
              </button>
            </div>
            {trackError && <div className="alert alert-error" style={{ marginTop: 12, marginBottom: 0 }}>{trackError}</div>}
          </form>

          {trackedReport && (
            <ReportDetail
              id={trackedReport.id}
              role="warga"
              onChanged={() => {
                loadReports();
              }}
            />
          )}
        </div>
      )}
    </SidebarShell>
  );
}
