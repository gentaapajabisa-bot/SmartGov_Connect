"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { STATUSES, STATUS_LABEL, type ReportDetailData, type Role, type StaffUser, type Status } from "@/lib/types";
import { compressImage } from "@/lib/image";
import { SlaBadge, Stars, StatusBadge, api, formatDate } from "./ui";

export default function ReportDetail({
  id,
  role,
  userId = 0,
  onChanged,
}: {
  id: number;
  role: Role;
  userId?: number;
  onChanged: () => void;
}) {
  const [report, setReport] = useState<ReportDetailData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>("baru");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [assignee, setAssignee] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const isStaff = role === "petugas" || role === "admin";

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await api<{ report: ReportDetailData }>(`/api/reports/${id}`);
      setReport(d.report);
      setStatus(d.report.status);
      setAssignee(d.report.assigned_to ? String(d.report.assigned_to) : "");
      setStars(d.report.rating?.stars ?? 0);
      setComment(d.report.rating?.comment ?? "");
    } catch (e) {
      setReport(null);
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    setSaved("");
    load();
  }, [load]);

  // Admin memilih petugas dari daftar; petugas biasa hanya bisa mengambil/melepas untuk dirinya.
  useEffect(() => {
    if (role !== "admin") return;
    api<{ staff: StaffUser[] }>("/api/staff")
      .then((d) => setStaff(d.staff))
      .catch(() => setStaff([]));
  }, [role]);

  async function patch(body: { status?: Status; note?: string; assigned_to?: number | null }, okMsg: string) {
    setError("");
    setSaved("");
    setBusy(true);
    try {
      await api(`/api/reports/${id}`, { method: "PATCH", body });
      setSaved(okMsg);
      await load();
      onChanged();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const note = String(new FormData(form).get("note") ?? "");
    const okay = await patch({ status, note }, "Perubahan tersimpan. Pelapor akan menerima notifikasi.");
    if (okay) form.reset();
  }

  async function sendRating() {
    if (stars < 1) {
      setError("Pilih jumlah bintang terlebih dahulu.");
      return;
    }
    setError("");
    setSaved("");
    setBusy(true);
    try {
      await api(`/api/reports/${id}/rating`, { body: { stars, comment: comment.trim() || undefined } });
      setSaved("Terima kasih atas penilaian Anda.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadProof(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setSaved("");
    setUploading(true);
    try {
      const file = files[0];
      if (!file.type.startsWith("image/")) throw new Error("Hanya berkas gambar yang dapat diunggah.");
      const blob = await compressImage(file);
      const res = await fetch(`/api/reports/${id}/photos`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Gagal mengunggah foto.");
      }
      setSaved("Foto bukti penyelesaian diunggah.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (error && !report) return <div className="card"><div className="alert alert-error">{error}</div></div>;
  if (!report) return <div className="card">Memuat...</div>;

  const closed = report.status === "selesai" || report.status === "ditolak";
  const canEdit = isStaff && (!closed || role === "admin");
  const mine = report.assigned_to === userId && userId > 0;

  return (
    <div className="card detail">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.88rem" }}>{report.ticket_no}</span>
        <StatusBadge status={report.status} />
      </div>
      <h2 style={{ marginTop: 8 }}>{report.title}</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{report.description}</p>

      {(["report", "proof"] as const).map((kind) => {
        const list = report.photos.filter((p) => p.kind === kind);
        if (list.length === 0) return null;
        return (
          <div key={kind}>
            <h3 style={{ fontSize: "0.95rem", marginTop: 14 }}>{kind === "proof" ? "Bukti penyelesaian" : "Foto laporan"}</h3>
            <ul className="thumbs thumbs-lg" aria-label={kind === "proof" ? "Foto bukti penyelesaian" : "Foto laporan"}>
              {list.map((p, i) => {
                const src = `/api/reports/${report.id}/photos/${p.id}`;
                return (
                  <li key={p.id}>
                    <a href={src} target="_blank" rel="noopener noreferrer" title="Buka ukuran penuh">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${kind === "proof" ? "Bukti penyelesaian" : "Foto laporan"} ${i + 1}`} loading="lazy" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

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
            <dt>Petugas</dt>
            <dd>{report.assigned_name ?? "Belum ditugaskan"}</dd>
          </>
        )}
        <dt>Dilaporkan</dt>
        <dd>{formatDate(report.created_at)}</dd>
        <dt>Target selesai</dt>
        <dd>
          {formatDate(report.due_at)} <SlaBadge status={report.status} due_at={report.due_at} overdue={report.overdue} />
        </dd>
        {report.votes > 0 && (
          <>
            <dt>Dukungan warga</dt>
            <dd>{report.votes} warga mendukung laporan ini</dd>
          </>
        )}
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

      {isStaff && canEdit && (
        <div className="panel">
          <h3 style={{ fontSize: "1rem" }}>Penugasan</h3>
          {role === "admin" ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                aria-label="Pilih petugas"
                style={{ flex: "1 1 200px", width: "auto" }}
              >
                <option value="">Belum ditugaskan</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.role === "admin" ? " (admin)" : ""}</option>
                ))}
              </select>
              <button
                className="btn btn-sm"
                disabled={busy || assignee === (report.assigned_to ? String(report.assigned_to) : "")}
                onClick={() => patch({ assigned_to: assignee ? Number(assignee) : null }, "Penugasan diperbarui.")}
              >
                Simpan penugasan
              </button>
            </div>
          ) : mine ? (
            <button className="btn btn-light btn-sm" disabled={busy} onClick={() => patch({ assigned_to: null }, "Penugasan dilepas.")}>
              Lepas penugasan saya
            </button>
          ) : (
            <button className="btn btn-sm" disabled={busy || userId <= 0} onClick={() => patch({ assigned_to: userId }, "Laporan kini ditugaskan kepada Anda.")}>
              {report.assigned_to ? "Ambil alih laporan ini" : "Ambil laporan ini"}
            </button>
          )}
        </div>
      )}

      {isStaff && canEdit && (report.status === "diproses" || report.status === "selesai") && (role === "admin" || mine) && (
        <div className="panel">
          <h3 style={{ fontSize: "1rem" }}>Bukti penyelesaian</h3>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || report.photos.filter((p) => p.kind === "proof").length >= 3}
            onChange={(e) => {
              void uploadProof(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="hint">{uploading ? "Mengunggah..." : "Foto kondisi setelah ditangani (maksimal 3). Terlihat oleh pelapor."}</span>
        </div>
      )}

      {role === "warga" && report.status === "selesai" && (
        <div className="panel">
          <h3 style={{ fontSize: "1rem" }}>Penilaian Anda</h3>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {saved && <div className="alert alert-ok" role="status">{saved}</div>}
          <div className="star-input" role="radiogroup" aria-label="Penilaian bintang">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                aria-label={`${n} bintang`}
                className={n <= stars ? "on" : ""}
                onClick={() => setStars(n)}
              >
                ★
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="rating-comment">Komentar (opsional)</label>
            <textarea id="rating-comment" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="Bagaimana penanganannya?" />
          </div>
          <button className="btn btn-sm" type="button" onClick={sendRating} disabled={busy}>
            {report.rating ? "Perbarui penilaian" : "Kirim penilaian"}
          </button>
        </div>
      )}

      {isStaff && report.rating && (
        <div className="panel">
          <h3 style={{ fontSize: "1rem" }}>Penilaian pelapor</h3>
          <Stars value={report.rating.stars} />
          {report.rating.comment && <p style={{ marginTop: 6 }}>{report.rating.comment}</p>}
        </div>
      )}

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
