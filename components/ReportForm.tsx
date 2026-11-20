"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { getOrCreateVoterKey, saveDeviceReport } from "@/lib/deviceReports";
import { compressImage } from "@/lib/image";
import type { Category, NearbyReport } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import MapPicker, { type LatLng } from "./MapPicker";
import { api } from "./ui";

const MAX_PHOTOS = 3;

interface Pick {
  file: File;
  preview: string;
}

export default function ReportForm({ onCreated }: { onCreated: (ticketNo?: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [ticket, setTicket] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [nearby, setNearby] = useState<NearbyReport[]>([]);
  const picksRef = useRef<Pick[]>([]);
  picksRef.current = picks;

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then((d) => setCategories(d.categories))
      .catch((e: Error) => setError(e.message));
    return () => picksRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  useEffect(() => {
    if (!coords) {
      setNearby([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      const p = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        voter_key: getOrCreateVoterKey(),
      });
      if (categoryId) p.set("category_id", categoryId);
      api<{ items: NearbyReport[] }>(`/api/reports/nearby?${p.toString()}`)
        .then((d) => {
          if (!cancelled) setNearby(d.items);
        })
        .catch(() => {
          if (!cancelled) setNearby([]);
        });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [coords, categoryId]);

  async function toggleVote(r: NearbyReport) {
    setError("");
    const voterKey = getOrCreateVoterKey();
    try {
      const d = await api<{ votes: number; voted: boolean }>(
        r.voted ? `/api/reports/${r.id}/vote?voter_key=${encodeURIComponent(voterKey)}` : `/api/reports/${r.id}/vote`,
        {
          method: r.voted ? "DELETE" : "POST",
          body: r.voted ? undefined : { voter_key: voterKey },
        }
      );
      setNearby((xs) => xs.map((x) => (x.id === r.id ? { ...x, votes: d.votes, voted: d.voted } : x)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

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
    const titleVal = String(f.get("title") ?? "");
    try {
      const res = await api<{ id: number; ticket_no: string; device_token: string }>("/api/reports", {
        body: {
          category_id: Number(f.get("category_id")),
          title: titleVal,
          description: f.get("description"),
          location_text: f.get("location_text"),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
      });

      // Simpan kode pelacakan + token perangkat secara lokal di browser warga
      saveDeviceReport({
        id: res.id,
        ticket_no: res.ticket_no,
        device_token: res.device_token,
        title: titleVal,
        created_at: new Date().toISOString(),
      });

      const failed: string[] = [];
      for (let i = 0; i < picks.length; i++) {
        setProgress(`Mengunggah foto ${i + 1} dari ${picks.length}...`);
        try {
          const blob = await compressImage(picks[i].file);
          const up = await fetch(`/api/reports/${res.id}/photos`, {
            method: "POST",
            headers: {
              "Content-Type": "image/jpeg",
              "x-device-token": res.device_token,
            },
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
      setCategoryId("");
      setGeoMsg("");
      onCreated(res.ticket_no);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" noValidate>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Formulir Pengaduan Anonim</h2>
        <span className="badge badge-selesai">100% Tanpa Identitas & Tanpa Login</span>
      </div>
      <p className="hint" style={{ marginBottom: 14 }}>
        Data pribadi seperti nama, NIK, email, atau nomor telepon tidak diminta dan tidak direkam demi keamanan pelapor.
      </p>

      {ticket && (
        <div className="alert alert-ok" role="status">
          Pengaduan anonim terkirim! Kode pelacakan Anda: <strong>#{ticket}</strong>. Kode ini otomatis tersimpan di perangkat Anda dan dapat digunakan untuk melacak progres maupun memberi rating.
        </div>
      )}
      {warning && <div className="alert alert-info" role="status">{warning}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="field">
        <label htmlFor="category_id">Kategori Masalah</label>
        <select id="category_id" name="category_id" required defaultValue="" onChange={(e) => setCategoryId(e.target.value)}>
          <option value="" disabled>Pilih kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="title">Judul Laporan</label>
        <input id="title" name="title" type="text" maxLength={150} required placeholder="Contoh: Jalan berlubang di Jl. Melati" />
      </div>

      <div className="field">
        <label htmlFor="description">Uraian Masalah</label>
        <textarea id="description" name="description" maxLength={2000} required placeholder="Jelaskan apa yang terjadi, sejak kapan, dan dampaknya." />
        <span className="hint">Minimal 15 karakter. Jangan mencantumkan identitas pribadi Anda maupun orang lain.</span>
      </div>

      <div className="field">
        <label htmlFor="location_text">Lokasi Kejadian (alamat atau patokan)</label>
        <input id="location_text" name="location_text" type="text" maxLength={255} required placeholder="Mis. Jl. Melati RT 03/RW 02, depan warung Bu Sari" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-light btn-sm" onClick={useMyLocation}>Gunakan lokasi saya</button>
          {coords && <button type="button" className="btn btn-light btn-sm" onClick={() => setCoords(null)}>Hapus penanda</button>}
        </div>
        {geoMsg && <span className="hint">{geoMsg}</span>}
        <MapPicker value={coords} onChange={setCoords} />
        {nearby.length > 0 && (
          <div className="nearby" role="region" aria-label="Laporan serupa di sekitar">
            <strong>Sudah ada laporan serupa di sekitar lokasi ini</strong>
            <span className="hint">Bila masalahnya sama, cukup dukung laporan yang ada agar prioritasnya naik.</span>
            <ul>
              {nearby.map((r) => (
                <li key={r.id}>
                  <div>
                    <div className="nearby-title">{r.title}</div>
                    <div className="hint">
                      {r.category_name} &middot; {STATUS_LABEL[r.status]} &middot; sekitar {r.distance_m} m &middot; {r.votes} dukungan
                    </div>
                  </div>
                  <button type="button" className={`btn btn-sm ${r.voted ? "btn-light" : ""}`} onClick={() => toggleVote(r)}>
                    {r.voted ? "Batalkan dukungan" : "Dukung"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="photos">Foto Pendukung (opsional, maksimal {MAX_PHOTOS})</label>
        <input
          id="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={picks.length >= MAX_PHOTOS || busy}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="hint">Foto dikompres otomatis. Hindari foto yang menampilkan wajah atau pelat nomor demi menjaga anonimitas.</span>
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

      <button className="btn" type="submit" disabled={busy}>{busy ? progress || "Mengirim..." : "Kirim Pengaduan Anonim"}</button>
    </form>
  );
}
