"use client";

import { useState } from "react";
import { KECAMATAN_PURBALINGGA } from "@/lib/purbalingga";
import { sanitizeAndCompressImage } from "@/lib/image-sanitize";

interface CategoryOption {
  id: number;
  name: string;
  agency_name?: string;
}

export default function PublicReportForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kecamatan, setKecamatan] = useState<string>("Purbalingga");
  const [desa, setDesa] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Peramban Anda tidak mendukung fitur GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setErrorMsg(null);
      },
      () => {
        setErrorMsg("Izin lokasi ditolak. Anda tetap dapat mengisi alamat secara manual.");
      }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setErrorMsg(null);
    const selected = Array.from(e.target.files).slice(0, 3);
    try {
      const cleanedFiles = await Promise.all(
        selected.map((file) => sanitizeAndCompressImage(file))
      );
      setPhotos(cleanedFiles);
    } catch {
      setErrorMsg("Gagal memproses foto bukti. Pastikan format JPG atau PNG.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("category_id", categoryId);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("kecamatan", kecamatan);
      formData.append("desa", desa);
      formData.append("address", address);
      if (coords) {
        formData.append("latitude", String(coords.lat));
        formData.append("longitude", String(coords.lng));
      }
      photos.forEach((photo) => formData.append("photos", photo));

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Gagal mengirim laporan.");
        return;
      }

      setTicketResult(json.ticket_code);
    } catch {
      setErrorMsg("Koneksi bermasalah. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  if (ticketResult) {
    return (
      <div className="sg-card sg-ticket-box">
        <span className="sg-pill">Laporan Anonim Berhasil Diterima</span>
        <h2 style={{ fontSize: "22px", margin: "8px 0 4px", color: "#fff" }}>
          Simpan Kode Tiket Pengaduan Anda
        </h2>
        <div className="sg-ticket-code">{ticketResult}</div>
        <p style={{ maxWidth: "480px", margin: "0 auto 20px", fontSize: "13px", color: "#cbd5e1" }}>
          Identitas Anda tidak disimpan oleh sistem. Gunakan kode tiket di atas pada tab{" "}
          <strong>Lacak Status Tiket</strong> untuk memantau progres penanganan dinas terkait.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(ticketResult)}
            className="sg-submit-btn"
            style={{ width: "auto", padding: "11px 22px" }}
          >
            Salin Kode Tiket
          </button>
          <button
            type="button"
            onClick={() => {
              setTicketResult(null);
              setTitle("");
              setDescription("");
              setAddress("");
              setPhotos([]);
            }}
            className="sg-tab"
          >
            Buat Laporan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sg-card">
      <div className="sg-privacy-banner">
        <span style={{ fontSize: "18px" }}>🛡️</span>
        <div>
          <strong>100% Anonim &amp; Tanpa Akun:</strong> Warga tidak perlu login atau mengisi nama,
          NIK, email, maupun nomor HP. Metadata kamera (EXIF) pada foto otomatis dihapus sebelum
          dikirim ke dinas terkait.
        </div>
      </div>

      {errorMsg && <div className="sg-alert-error">{errorMsg}</div>}

      <div className="sg-grid-2">
        <div className="sg-field">
          <label className="sg-label">Kategori Kejadian / Dinas Tujuan *</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="sg-select"
          >
            <option value="">-- Pilih Jenis Laporan --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} {cat.agency_name ? `→ ${cat.agency_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="sg-field">
          <label className="sg-label">Judul Singkat Laporan *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Jalan berlubang parah di depan Balai Desa"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sg-input"
          />
        </div>
      </div>

      <div className="sg-grid-2">
        <div className="sg-field">
          <label className="sg-label">Kecamatan (Kab. Purbalingga) *</label>
          <select
            required
            value={kecamatan}
            onChange={(e) => setKecamatan(e.target.value)}
            className="sg-select"
          >
            {KECAMATAN_PURBALINGGA.map((kec) => (
              <option key={kec} value={kec}>
                Kec. {kec}
              </option>
            ))}
          </select>
        </div>

        <div className="sg-field">
          <label className="sg-label">Desa / Kelurahan *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Kalikabong"
            value={desa}
            onChange={(e) => setDesa(e.target.value)}
            className="sg-input"
          />
        </div>
      </div>

      <div className="sg-field">
        <div className="sg-label-row">
          <label className="sg-label">Detail Alamat / Patokan Lokasi *</label>
          <button type="button" onClick={handleGetLocation} className="sg-gps-btn">
            {coords ? `📍 GPS Terkunci (${coords.lat}, ${coords.lng})` : "📍 Ambil Titik GPS"}
          </button>
        </div>
        <input
          type="text"
          required
          placeholder="Contoh: Jl. Raya Bojongsari KM 4, sebelah selatan pasar"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="sg-input"
        />
      </div>

      <div className="sg-field">
        <label className="sg-label">Uraian Lengkap Kejadian *</label>
        <textarea
          required
          rows={4}
          placeholder="Jelaskan kondisi lapangan, tingkat kerusakan, atau hal yang meresahkan warga..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sg-textarea"
        />
      </div>

      <div className="sg-field">
        <label className="sg-label">
          Lampiran Foto Bukti (Maks. 3 Foto — Metadata Kamera Dihapus Otomatis)
        </label>
        <div className="sg-file-box">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            style={{ color: "#cbd5e1", fontSize: "13px" }}
          />
          {photos.length > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#34d399", fontWeight: 600 }}>
              ✓ {photos.length} foto bersih siap diunggah
            </p>
          )}
        </div>
      </div>

      <button type="submit" disabled={loading} className="sg-submit-btn">
        {loading ? "Mengirim Laporan ke Dinas Terkait..." : "Kirim Laporan Anonim Sekarang"}
      </button>
    </form>
  );
}
