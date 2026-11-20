# Panduan Replace File - SmartGov Connect Kabupaten Purbalingga

Ekstrak isi folder ZIP ini langsung ke root folder proyek `SmartGov_Connect/` Anda (sejajar dengan `package.json`), lalu pilih **Replace / Timpa** jika diminta.

## Daftar File di Dalam Paket Ini
- `lib/purbalingga.ts` : Data koordinat Kabupaten Purbalingga, daftar 18 kecamatan, dan kontak darurat.
- `lib/image-sanitize.ts` : Penghapus metadata EXIF foto & kompresi di sisi browser pelapor.
- `app/api/reports/route.ts` : API pelaporan 100% anonim (tanpa login) & isolasi laporan per OPD.
- `app/api/reports/track/[ticket]/route.ts` : API pelacakan status laporan via nomor tiket.
- `app/api/emergency/route.ts` : API daftar kontak darurat Kabupaten Purbalingga.
- `components/EmergencyBar.tsx` : Panel panggilan cepat kontak darurat (Polres, Damkar, BPBD, RSUD, 112).
- `components/PublicReportForm.tsx` : Form lapor warga anonim dengan wilayah Purbalingga & GPS.
- `components/TicketTracker.tsx` : Komponen pelacakan nomor tiket publik.
- `app/lapor/page.tsx` : Halaman publik pelaporan anonim (`/lapor`).
- `app/lacak/page.tsx` : Halaman publik pelacakan tiket (`/lacak`).
- `database/migration_purbalingga.sql` : Cadangan skrip migrasi database TiDB.

## Catatan Penting
1. Pastikan rute publik (`/lapor`, `/lacak`, `/api/reports` untuk `POST`, `/api/reports/track/*`, `/api/emergency`) tidak diblokir oleh `middleware.ts`.
2. Pada `lib/auth.ts`, pastikan fungsi `getSessionUser()` ikut mengambil kolom `agency_id` dari tabel `users` agar filter laporan per dinas (DPUPR, Satpol PP, dll.) berjalan otomatis.
