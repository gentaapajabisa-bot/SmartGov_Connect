"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABEL, type ReportDetailData, type Role, type Status } from "@/lib/types";
import { StatusBadge, api, formatDate } from "./ui";

export default function ReportDetail({
  id,
  role,
  onChanged,
}: {
  id: number;
  role: Role;
  onChanged: () => void;
}) {
  const [report, setReport] = useState<ReportDetailData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>("baru");
  const isStaff = role === "petugas" || role === "admin";

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await api<{ report: ReportDetailData }>(`/api/reports/${id}`);
      setReport(d.report);
      setStatus(d.report.status);
    } catch (e) {
      setReport(null);
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    setSaved("");
    load();
  }, [load]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved("");
    setBusy(true);
    const form = e.currentTarget;
    const note = String(new FormData(form).get("note") ?? "");
    try {
      await api(`/api/reports/${id}`, { method: "PATCH", body: { status, note } });
      form.reset();
      setSaved("Perubahan tersimpan.");
      await load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !report) return <div className="card"><div className="alert alert-error">{error}</div></div>;
  if (!report) return <div className="card">Memuat...</div>;

  const closed = report.status === "selesai" || report.status === "ditolak";
  const canEdit = isStaff && (!closed || role === "admin");

  return (
    <div className="card detail">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.88rem" }}>{report.ticket_no}</span>
        <StatusBadge status={report.status} />
      </div>
      <h2 style={{ marginTop: 8 }}>{report.title}</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{report.description}</p>

      <dl>
        <dt>Kategori</dt>
        <dd>{report.category_name}</dd>
        <dt>Lokasi</dt>
        <dd>
          {report.location_text}
          {report.latitude !== null && report.longitude !== null && (
            <>
              {" "}
              <a
                href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=18/${report.latitude}/${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                (lihat di peta)
              </a>
            </>
          )}
        </dd>
        {isStaff && (
          <>
            <dt>Pelapor</dt>
            <dd>{report.reporter_name ?? (report.is_anonymous ? "Anonim (disembunyikan)" : "-")}</dd>
          </>
        )}
        <dt>Dilaporkan</dt>
        <dd>{formatDate(report.created_at)}</dd>
        {report.officer_note && (
          <>
            <dt>Catatan terakhir</dt>
            <dd>{report.officer_note}</dd>
          </>
        )}
      </dl>

      <h3 style={{ fontSize: "1rem", marginTop: 20 }}>Riwayat status</h3>
      <ul className="timeline">
        {[...report.history].reverse().map((h) => (
          <li key={h.id}>
            <StatusBadge status={h.status} />
            <div className="when">{formatDate(h.created_at)} &middot; {h.actor}</div>
            {h.note && <div className="note">{h.note}</div>}
          </li>
        ))}
      </ul>

      {isStaff && (
        <form onSubmit={onSubmit} className="panel">
          <h3 style={{ fontSize: "1rem" }}>Tindak lanjut</h3>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {saved && <div className="alert alert-ok" role="status">{saved}</div>}
          {!canEdit ? (
            <div className="alert alert-info">Laporan sudah ditutup. Hanya admin yang dapat mengubahnya kembali.</div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="note">Catatan tindak lanjut</label>
                <textarea id="note" name="note" maxLength={1000} placeholder="Langkah yang diambil, atau alasan jika ditolak." />
                <span className="hint">Catatan ini terlihat oleh pelapor. Wajib diisi bila status Ditolak.</span>
              </div>
              <button className="btn" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
