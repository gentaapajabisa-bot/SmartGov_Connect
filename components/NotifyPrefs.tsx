"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./ui";

interface Prefs {
  notify_email: boolean;
  notify_wa: boolean;
  has_phone: boolean;
  email_verified: boolean;
  email_available: boolean;
  wa_available: boolean;
}

// Pengaturan cara menerima pembaruan status laporan di luar lonceng aplikasi.
export default function NotifyPrefs() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPrefs((await api<{ prefs: Prefs }>("/api/auth/preferences")).prefs);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function set(body: { notify_email?: boolean; notify_wa?: boolean }) {
    setError("");
    setBusy(true);
    try {
      setPrefs((await api<{ prefs: Prefs }>("/api/auth/preferences", { method: "PATCH", body })).prefs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) return error ? <div className="alert alert-error">{error}</div> : <div className="empty">Memuat...</div>;

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: "1.2rem" }}>Notifikasi pembaruan laporan</h2>
      <p className="muted">Lonceng di pojok atas selalu aktif. Anda juga dapat menerima pemberitahuan saat status laporan berubah.</p>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <label className="check">
        <input
          type="checkbox"
          checked={prefs.notify_email}
          disabled={busy || !prefs.email_verified}
          onChange={(e) => set({ notify_email: e.target.checked })}
        />
        <span>
          Kirim ke email saya
          {!prefs.email_verified && <span className="hint"> Verifikasi email dulu (lihat banner di atas dashboard).</span>}
          {prefs.email_verified && !prefs.email_available && <span className="hint"> Layanan email belum diaktifkan, pengiriman belum berjalan.</span>}
        </span>
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={prefs.notify_wa}
          disabled={busy || !prefs.wa_available || !prefs.has_phone}
          onChange={(e) => set({ notify_wa: e.target.checked })}
        />
        <span>
          Kirim ke WhatsApp saya
          {!prefs.wa_available && <span className="hint"> Belum tersedia (belum diaktifkan oleh pengelola).</span>}
          {prefs.wa_available && !prefs.has_phone && <span className="hint"> Tambahkan nomor HP saat mendaftar untuk memakai fitur ini.</span>}
        </span>
      </label>
      <p className="hint">Pesan hanya memuat nomor tiket dan status baru, tanpa isi catatan petugas.</p>
    </div>
  );
}
