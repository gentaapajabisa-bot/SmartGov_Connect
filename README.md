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
| Unggah foto laporan (maks. 3, dikompres di peramban, disimpan di TiDB, hanya dapat dibuka oleh pihak berwenang) | Sudah ada |
| Peta interaktif: pilih lokasi di peta saat melapor; peta sebaran laporan untuk petugas/admin | Sudah ada |
| Notifikasi dalam aplikasi (lonceng) saat status, catatan, atau penugasan berubah | Sudah ada |
| Penugasan laporan: admin menugaskan petugas, petugas dapat mengambil/melepas | Sudah ada |
| Analitik: filter periode dan kategori, rata-rata waktu penyelesaian, beban kerja petugas, ekspor CSV | Sudah ada |
| Pembatasan percobaan (login, daftar, lupa sandi) berbasis database | Sudah ada |
| Reset kata sandi dan verifikasi email (via Resend; opsional) | Sudah ada |
| Kebijakan privasi (templat) dan persetujuan saat mendaftar | Sudah ada |
| Log audit tindakan admin (pengguna dan kategori) | Sudah ada |
| Target waktu penanganan (SLA) per kategori, penanda "Terlambat", statistik keterlambatan | Sudah ada |
| Peringatan laporan serupa (radius 250 m) dan dukungan warga; staf dapat mengurutkan menurut dukungan | Sudah ada |
| Penilaian warga (bintang + komentar) setelah laporan selesai; rata-rata per petugas di statistik | Sudah ada |
| Foto bukti penyelesaian dari petugas yang ditugaskan atau admin | Sudah ada |
| Notifikasi email dan WhatsApp saat status berubah (opt-in per warga, di tab Notifikasi) | Sudah ada (WhatsApp belum diuji dengan penyedia nyata) |
| Peta panas sebaran laporan (staf/admin) | Sudah ada |
| Mode terang/gelap (pilihan tersimpan di peramban; bawaan gelap) | Sudah ada |
| PWA: dapat dipasang di HP/komputer, halaman offline saat jaringan putus | Sudah ada |

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

**Foto:** disimpan di TiDB (kolom MEDIUMBLOB) agar tidak butuh layanan tambahan. Jika volume foto besar, pindahkan ke penyimpanan objek seperti Vercel Blob.

**Peta:** memakai tile OpenStreetMap; untuk lalu lintas besar gunakan penyedia tile sendiri sesuai ketentuan OSM.

**Migrasi database (wajib bila sebelumnya sudah memakai versi lama):** jalankan `npm run db:migrate` (aman diulang) atau tempelkan `database/schema.sql` di SQL Editor TiDB, lalu `npm install` untuk paket peta.

**Lainnya:** notifikasi email/WhatsApp, reset kata sandi, dan SLA waktu penanganan.

## Email (Resend)

1. Daftar di https://resend.com dan buat API key.
2. Di Vercel (Settings, Environment Variables) tambahkan `RESEND_API_KEY`, `APP_URL` (mis. `https://smartgovconnect.vercel.app`), dan opsional `MAIL_FROM`.
3. Tanpa domain terverifikasi, Resend hanya mengirim ke email pemilik akun Resend. Untuk warga umum, verifikasi domain Anda di Resend.
4. Tanpa `RESEND_API_KEY`, aplikasi tetap berjalan tetapi email tidak terkirim.

## Migrasi Tahap 2

Jalankan `npm run db:migrate` (aman diulang). Perintah ini menambah `categories.sla_hours` (nilai awal 24 jam untuk Keamanan, 72 jam untuk Kebersihan/Penerangan/Administrasi, 168 jam lainnya), `report_photos.kind`, serta tabel `report_votes` dan `report_ratings`. Target SLA dapat diubah admin di tab Kategori.

## Migrasi dan konfigurasi Tahap 3

- Jalankan `npm run db:migrate` (menambah `users.notify_email` dan `users.notify_wa`).
- Email: lihat bagian Email (Resend). Pembaruan hanya dikirim ke warga yang sudah memverifikasi email dan mengaktifkan opsinya.
- WhatsApp (opsional): isi `WHATSAPP_TOKEN` (contoh penyedia: Fonnte) di Vercel. Opsi ini hanya muncul bagi warga yang menyimpan nomor HP. Kode pengiriman belum diuji dengan akun penyedia nyata, sesuaikan `WHATSAPP_API_URL` atau `lib/whatsapp.ts` bila penyedia Anda berbeda.
- PWA: aktif otomatis di produksi (Vercel). Service worker hanya menampilkan halaman offline dan tidak menyimpan halaman atau data API.
- Tema terang: animasi kota 3D dimatikan pada tema terang.
