"use client";

import { useState } from "react";

export default function TicketTracker() {
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ticket.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setErrorMsg(null);
    setData(null);

    try {
      const res = await fetch(`/api/reports/track/${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Nomor tiket tidak ditemukan.");
      } else {
        setData(json);
      }
    } catch {
      setErrorMsg("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sg-card">
      <h2 style={{ fontSize: "19px", margin: "0 0 6px", color: "#fff" }}>
        Lacak Progres Tindak Lanjut
      </h2>
      <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 18px" }}>
        Masukkan kode tiket pengaduan untuk melihat status penanganan oleh OPD Kabupaten Purbalingga.
      </p>

      <form onSubmit={handleTrack} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Contoh: SGC-20261120-A1B2C3"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          className="sg-input"
          style={{ flex: "1 1 240px", fontFamily: "monospace", textTransform: "uppercase" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="sg-submit-btn"
          style={{ width: "auto", padding: "11px 24px" }}
        >
          {loading ? "Mencari..." : "Lacak Tiket"}
        </button>
      </form>

      {errorMsg && (
        <div className="sg-alert-error" style={{ marginTop: "16px", marginBottom: 0 }}>
          {errorMsg}
        </div>
      )}

      {data && (
        <div
          style={{
            marginTop: "22px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          <span className="sg-pill">{data.report.agency_name || "Dinas Terkait"}</span>
          <h3 style={{ fontSize: "18px", margin: "8px 0 4px", color: "#fff" }}>
            {data.report.title}
          </h3>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 16px" }}>
            📍 {data.report.location}
          </p>

          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            Riwayat Penanganan Petugas
          </p>

          {data.history.map((h: any, idx: number) => (
            <div key={idx} className="sg-timeline-item">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <strong style={{ color: "#34d399", textTransform: "uppercase" }}>{h.status}</strong>
                <span style={{ color: "#94a3b8" }}>
                  {new Date(h.created_at).toLocaleString("id-ID")}
                </span>
              </div>
              {h.note && (
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#e2e8f0" }}>{h.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
