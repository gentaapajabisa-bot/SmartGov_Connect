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
        setErrorMsg("Izin lokasi ditolak. Anda tetap bisa mengisi alamat manual.");
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
      setErrorMsg("Gagal memproses foto bukti. Pastikan format JPG/PNG.");
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
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-500">
          LAPORAN ANONIM BERHASIL TERKIRIM
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
          Simpan Nomor Tiket Anda
        </h3>
        <div className="my-4 inline-block rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 font-mono text-2xl font-bold tracking-wider text-emerald-400">
          {ticketResult}
        </div>
        <p className="mx-auto max-w-md text-xs text-slate-600 dark:text-slate-300">
          Identitas Anda tidak dicatat oleh sistem. Gunakan nomor tiket di atas pada menu{" "}
          <strong>Lacak Laporan</strong> untuk memantau tindak lanjut petugas.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(ticketResult)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Salin Nomor Tiket
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
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Buat Laporan Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
        <strong>Privasi Terjamin:</strong> Pelaporan ini 100% anonim. Tanpa login, tanpa nama,
        email, maupun nomor HP. Metadata kamera pada foto otomatis dibersihkan.
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Kategori Laporan *</label>
        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        >
          <option value="">-- Pilih Jenis Kejadian / Dinas Terkait --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} {cat.agency_name ? `(${cat.agency_name})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Judul Singkat Laporan *</label>
        <input
          type="text"
          required
          placeholder="Contoh: Jalan berlubang cukup dalam di depan Balai Desa"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Kecamatan (Kab. Purbalingga) *</label>
          <select
            required
            value={kecamatan}
            onChange={(e) => setKecamatan(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
          >
            {KECAMATAN_PURBALINGGA.map((kec) => (
              <option key={kec} value={kec}>
                Kec. {kec}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Desa / Kelurahan *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Kalikabong"
            value={desa}
            onChange={(e) => setDesa(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">Detail Alamat / Patokan Lokasi *</label>
          <button
            type="button"
            onClick={handleGetLocation}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {coords ? `Titik GPS Terkunci (${coords.lat}, ${coords.lng})` : "+ Ambil Titik GPS Saat Ini"}
          </button>
        </div>
        <input
          type="text"
          required
          placeholder="Contoh: Jl. Raya Bojongsari KM 4, selatan pasar"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Uraian Kejadian *</label>
        <textarea
          required
          rows={4}
          placeholder="Jelaskan kondisi di lapangan secara jelas..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Bukti Foto (Maks. 3 Foto, Otomatis Tanpa Metadata EXIF)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        {photos.length > 0 && (
          <p className="mt-1 text-xs text-emerald-500">
            {photos.length} foto siap diunggah (metadata perangkat telah dihapus).
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Mengirim Laporan Anonim..." : "Kirim Laporan Sekarang"}
      </button>
    </form>
  );
}
