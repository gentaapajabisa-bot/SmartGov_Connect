# SmartGov Connect

Platform pengaduan warga untuk kelurahan. Dibangun dengan **Next.js 14 (App Router) + TypeScript**, database **TiDB** (kompatibel MySQL), dan siap di-deploy ke **Vercel**.

Tiga jenis pengguna: **Warga**, **Petugas Kelurahan**, **Admin**.

## Status fitur

| Fitur | Status |
|---|---|
| Registrasi dan login warga (kata sandi di-hash bcrypt, sesi JWT di cookie HttpOnly) | Sudah ada |
| Buat pengaduan, nomor tiket otomatis (`SGC-YYYYMMDD-XXXXXX`) | Sudah ada |
| Lokasi: alamat teks + koordinat opsional dari GPS peramban | Sudah ada |
| Lacak status dan riwayat status (timeline) | Sudah ada |
| Petugas: lihat laporan, ubah status, catatan tindak lanjut | Sudah ada |
| Admin: kelola pengguna, peran, kategori, lihat statistik | Sudah ada |
| Pembatasan akses berdasarkan peran (dicek di server pada setiap API) | Sudah ada |
| Opsi lapor anonim terhadap petugas | Sudah ada |
| **Unggah foto** | **Belum aktif** (kolom `photo_url` sudah disiapkan; perlu Vercel Blob atau penyimpanan lain) |
| **Peta interaktif** | **Belum aktif** (saat ini hanya tautan ke OpenStreetMap bila koordinat ada) |
| Notifikasi email/WhatsApp, pembatasan percobaan login (rate limit), reset kata sandi | Belum ada |

> Catatan pengujian: kode ini sudah lolos pemeriksaan sintaks, tetapi **belum pernah dijalankan** terhadap database TiDB sungguhan karena paket npm tidak dapat dipasang di lingkungan pembuatnya. Jalankan langkah di bawah dan laporkan galat bila ada.

## Menjalankan di komputer

Prasyarat: **Node.js 20.6 atau lebih baru** dan akun **TiDB Cloud** (paket Starter/gratis cukup).

1. **Pasang dependensi**
   ```bash
   npm install
   ```

2. **Siapkan database TiDB**
   - Di TiDB Cloud, buat cluster, lalu klik **Connect** untuk mengambil host, port, user, dan password.
   - Cluster baru biasanya memiliki database `test`. Anda boleh memakai nama lain; skrip akan membuatnya bila belum ada.

3. **Isi konfigurasi**
   ```bash
   cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
   ```
   Edit `.env.local`: isi `TIDB_*`, `AUTH_SECRET`, serta `ADMIN_EMAIL` dan `ADMIN_PASSWORD`.
   Buat `AUTH_SECRET` dengan:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

4. **Buat tabel dan akun admin**
   ```bash
   npm run db:init          # menjalankan database/schema.sql
   npm run db:seed-admin    # membuat akun admin dari ADMIN_EMAIL / ADMIN_PASSWORD
   ```
   Alternatif: salin isi `database/schema.sql` ke SQL Editor TiDB Cloud dan jalankan di sana.

5. **Jalankan**
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000.

6. **Coba alur lengkap**
   1. Masuk sebagai admin, buka tab **Pengguna**, buat akun **Petugas**.
   2. Keluar, daftar sebagai **Warga**, buat pengaduan, catat nomor tiketnya.
   3. Masuk sebagai petugas, buka laporan, ubah status dan isi catatan.
   4. Masuk kembali sebagai warga dan lihat riwayat statusnya.
   5. Setelah berhasil masuk sebagai admin, hapus `ADMIN_PASSWORD` dari `.env.local`.

## Deploy ke Vercel

1. Unggah proyek ke repositori GitHub (`.env.local` sudah masuk `.gitignore`; jangan di-commit).
2. Di Vercel: **Add New → Project**, pilih repositori. Framework akan terdeteksi sebagai Next.js.
3. Pada **Environment Variables**, isi: `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`, `AUTH_SECRET`.
   Gunakan `AUTH_SECRET` yang **berbeda** dari yang dipakai di komputer lokal.
4. Klik **Deploy**. Skema database cukup dijalankan sekali (langkah 4 di atas) dari komputer Anda; deploy Vercel memakai database yang sama.
5. Bila TiDB Cloud Anda membatasi alamat IP, izinkan akses dari Vercel atau gunakan opsi akses publik yang sesuai kebijakan Anda.

## Struktur proyek

```
app/
  api/auth/        register, login, logout, me
  api/reports/     daftar + buat laporan, detail + ubah status
  api/categories/  kategori aktif (untuk form)
  api/admin/       users, categories, stats (khusus admin)
  dashboard/       halaman sesuai peran
  login/ register/ page.tsx
components/        AuthForm, ReportForm, ReportBrowser, ReportDetail, CitizenView, AdminPanel, ...
lib/               db.ts, auth.ts, http.ts, validation.ts, reports.ts, types.ts
database/schema.sql
scripts/           init-db.mjs, seed-admin.mjs
middleware.ts      gerbang awal untuk /dashboard
```

## Keamanan dan perlindungan data pribadi

- Kata sandi disimpan sebagai hash bcrypt (cost 12); tidak pernah dikembalikan oleh API.
- Sesi memakai cookie `HttpOnly`, `SameSite=Lax`, dan `Secure` di produksi. **Peran dibaca dari database pada setiap permintaan**, sehingga perubahan peran atau penonaktifan akun berlaku seketika.
- Setiap API memeriksa peran di server; middleware hanya gerbang awal.
- Warga hanya dapat membuka laporannya sendiri (laporan orang lain dijawab 404).
- Email dan nomor HP pelapor tidak pernah ditampilkan pada daftar atau detail laporan. Nama pelapor disembunyikan dari petugas bila laporan anonim.
- Query memakai parameter terikat (bukan penyambungan string), dan semua input divalidasi dengan Zod.
- Pesan galat login sama untuk email tidak terdaftar dan kata sandi salah.

**Yang masih perlu Anda pertimbangkan sebelum dipakai warga sungguhan:**
- Pembatasan percobaan login (rate limiting), misalnya lewat Vercel Firewall atau Upstash Ratelimit.
- Reset kata sandi dan verifikasi email.
- Kebijakan privasi dan persetujuan pengguna sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.
- Pengguna database khusus aplikasi dengan hak minimal, serta pencadangan data.

## Langkah pengembangan berikutnya

**Unggah foto (Vercel Blob)**
1. Aktifkan Blob di dashboard Vercel, tambahkan `BLOB_READ_WRITE_TOKEN`, lalu `npm i @vercel/blob`.
2. Buat `app/api/reports/photo/route.ts` yang memeriksa peran warga, tipe file (JPEG/PNG/WebP), dan ukuran maksimum, lalu memanggil `put()`.
3. Simpan URL hasilnya ke `reports.photo_url` dan tampilkan di `ReportDetail`.
   Jangan menerima URL foto langsung dari klien tanpa melalui unggahan ini.

**Peta interaktif (Leaflet + OpenStreetMap)**
1. `npm i leaflet react-leaflet` dan `npm i -D @types/leaflet`.
2. Buat komponen peta dan muat dengan `next/dynamic` (`ssr: false`).
3. Hubungkan klik peta ke kolom `latitude` dan `longitude` di `ReportForm`. Perhatikan ketentuan penggunaan tile OpenStreetMap atau gunakan penyedia tile sendiri untuk lalu lintas besar.

**Lainnya:** notifikasi status, ekspor laporan ke CSV, penugasan laporan ke petugas tertentu, dan SLA waktu penanganan.
