"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category } from "@/lib/types";
import { api } from "./ui";

export default function ReportForm({ onCreated }: { onCreated: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then((d) => setCategories(d.categories))
      .catch((e: Error) => setError(e.message));
  }, []);

  function useMyLocation() {
    setGeoMsg("");
    if (!("geolocation" in navigator)) {
      setGeoMsg("Peramban Anda tidak mendukung penentuan lokasi.");
      return;
    }
    setGeoMsg("Mencari lokasi...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) });
        setGeoMsg("Koordinat tersimpan. Tetap isi alamat pada kolom lokasi.");
      },
      () => setGeoMsg("Tidak dapat mengambil lokasi. Isi alamat secara manual."),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setTicket("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const res = await api<{ ticket_no: string }>("/api/reports", {
        body: {
          category_id: Number(f.get("category_id")),
          title: f.get("title"),
          description: f.get("description"),
          location_text: f.get("location_text"),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          is_anonymous: f.get("is_anonymous") === "on",
        },
      });
      setTicket(res.ticket_no);
      form.reset();
      setCoords(null);
      setGeoMsg("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" noValidate>
      <h2 style={{ fontSize: "1.2rem" }}>Buat pengaduan baru</h2>

      {ticket && (
        <div className="alert alert-ok" role="status">
          Pengaduan terkirim. Nomor tiket Anda: <strong>{ticket}</strong>. Simpan nomor ini untuk melacak laporan.
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="field">
        <label htmlFor="category_id">Kategori</label>
        <select id="category_id" name="category_id" required defaultValue="">
          <option value="" disabled>Pilih kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="title">Judul laporan</label>
        <input id="title" name="title" type="text" maxLength={150} required placeholder="Contoh: Lampu jalan mati di depan SDN 2" />
      </div>

      <div className="field">
        <label htmlFor="description">Uraian</label>
        <textarea id="description" name="description" maxLength={2000} required placeholder="Jelaskan apa yang terjadi, sejak kapan, dan dampaknya." />
        <span className="hint">Minimal 20 karakter. Jangan menulis data pribadi orang lain.</span>
      </div>

      <div className="field">
        <label htmlFor="location_text">Lokasi</label>
        <input id="location_text" name="location_text" type="text" maxLength={255} required placeholder="Alamat atau patokan, mis. Jl. Melati RT 03/RW 02" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-light btn-sm" onClick={useMyLocation}>Gunakan lokasi saya</button>
          {coords && <span className="hint">Koordinat: {coords.lat}, {coords.lng}</span>}
        </div>
        {geoMsg && <span className="hint">{geoMsg}</span>}
      </div>

      <div className="alert alert-info">
        Unggah foto dan peta interaktif belum tersedia pada versi ini.
      </div>

      <label className="check">
        <input type="checkbox" name="is_anonymous" />
        <span>Sembunyikan nama saya dari petugas kelurahan (admin tetap dapat melihatnya untuk keperluan moderasi).</span>
      </label>

      <button className="btn" type="submit" disabled={busy}>{busy ? "Mengirim..." : "Kirim pengaduan"}</button>
    </form>
  );
}
