"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import type { Category } from "@/lib/types";
import MapPicker, { type LatLng } from "./MapPicker";
import { api } from "./ui";

const MAX_PHOTOS = 3;

interface Pick {
  file: File;
  preview: string;
}

export default function ReportForm({ onCreated }: { onCreated: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [ticket, setTicket] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const picksRef = useRef<Pick[]>([]);
  picksRef.current = picks;

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then((d) => setCategories(d.categories))
      .catch((e: Error) => setError(e.message));
    // lepas URL pratinjau saat komponen ditutup
    return () => picksRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
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
        setGeoMsg("Lokasi ditemukan. Geser penanda dengan mengklik peta bila perlu.");
      },
      () => setGeoMsg("Tidak dapat mengambil lokasi. Klik peta untuk menandai secara manual."),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const room = MAX_PHOTOS - picks.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    const bad = chosen.find((f) => !f.type.startsWith("image/"));
    if (bad) {
      setError("Hanya berkas gambar (JPEG, PNG, WebP) yang dapat dilampirkan.");
      return;
    }
    if (files.length > room) setWarning(`Maksimal ${MAX_PHOTOS} foto; sebagian tidak ditambahkan.`);
    else setWarning("");
    setPicks((xs) => [...xs, ...chosen.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  function removePick(i: number) {
    setPicks((xs) => {
      URL.revokeObjectURL(xs[i].preview);
      return xs.filter((_, idx) => idx !== i);
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setWarning("");
    setTicket("");
    setProgress("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const res = await api<{ id: number; ticket_no: string }>("/api/reports", {
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

      // Laporan sudah tersimpan; foto diunggah satu per satu dan kegagalannya tidak membatalkan laporan.
      const failed: string[] = [];
      for (let i = 0; i < picks.length; i++) {
        setProgress(`Mengunggah foto ${i + 1} dari ${picks.length}...`);
        try {
          const blob = await compressImage(picks[i].file);
          const up = await fetch(`/api/reports/${res.id}/photos`, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          if (!up.ok) {
            const d = (await up.json().catch(() => ({}))) as { error?: string };
            throw new Error(d.error ?? "Gagal mengunggah.");
          }
        } catch (err) {
          failed.push(`${picks[i].file.name}: ${(err as Error).message}`);
        }
      }
      setProgress("");
      if (failed.length) {
        setWarning(`Laporan terkirim, tetapi ${failed.length} foto gagal diunggah (${failed.join("; ")}).`);
      }

      setTicket(res.ticket_no);
      form.reset();
      picks.forEach((p) => URL.revokeObjectURL(p.preview));
      setPicks([]);
      setCoords(null);
      setGeoMsg("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
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
      {warning && <div className="alert alert-info" role="status">{warning}</div>}
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
        <label htmlFor="location_text">Lokasi (alamat atau patokan)</label>
        <input id="location_text" name="location_text" type="text" maxLength={255} required placeholder="Mis. Jl. Melati RT 03/RW 02, depan warung Bu Sari" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-light btn-sm" onClick={useMyLocation}>Gunakan lokasi saya</button>
          {coords && <button type="button" className="btn btn-light btn-sm" onClick={() => setCoords(null)}>Hapus penanda</button>}
        </div>
        {geoMsg && <span className="hint">{geoMsg}</span>}
        <MapPicker value={coords} onChange={setCoords} />
      </div>

      <div className="field">
        <label htmlFor="photos">Foto pendukung (opsional, maksimal {MAX_PHOTOS})</label>
        <input
          id="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={picks.length >= MAX_PHOTOS || busy}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ""; // memungkinkan memilih berkas yang sama lagi
          }}
        />
        <span className="hint">Foto dikompres otomatis sebelum dikirim. Hindari foto yang menampilkan wajah atau pelat nomor yang tidak perlu.</span>
        {picks.length > 0 && (
          <ul className="thumbs">
            {picks.map((p, i) => (
              <li key={p.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Pratinjau foto ${i + 1}`} />
                <button type="button" onClick={() => removePick(i)} aria-label={`Hapus foto ${i + 1}`} disabled={busy}>
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="check">
        <input type="checkbox" name="is_anonymous" />
        <span>Sembunyikan nama saya dari petugas kelurahan (admin tetap dapat melihatnya untuk keperluan moderasi).</span>
      </label>

      <button className="btn" type="submit" disabled={busy}>{busy ? progress || "Mengirim..." : "Kirim pengaduan"}</button>
    </form>
  );
}
