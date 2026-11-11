import Link from "next/link";
import CityScape from "@/components/CityScape";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const ICON = {
  warga: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>
  ),
  petugas: (
    <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15v-3M12 15V9M17 15v-5" /></svg>
  ),
};

export default async function Home() {
  // Landing page tetap tampil bila database belum dikonfigurasi.
  let user: SessionUser | null = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  return (
    <>
      <Header user={user} />

      <section className="hero">
        <span className="orb o1" aria-hidden="true" />
        <span className="orb o2" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="page-in">
            <span className="eyebrow">Smart City &middot; Layanan Kelurahan</span>
            <h1>
              Suara warga, <span className="gradient-text">tindak lanjut</span> yang terlihat.
            </h1>
            <p className="lead">
              SmartGov Connect menghubungkan warga dengan petugas kelurahan. Laporkan masalah lingkungan,
              dapatkan nomor tiket, dan pantau setiap perkembangannya secara transparan.
            </p>
            <div className="actions">
              {user ? (
                <Link href="/dashboard" className="btn btn-lg">Buka Dashboard</Link>
              ) : (
                <>
                  <Link href="/register" className="btn btn-lg">Buat Pengaduan</Link>
                  <Link href="/login" className="btn btn-ghost btn-lg">Masuk</Link>
                </>
              )}
            </div>
          </div>

          {/* Kartu contoh: ilustrasi tampilan pelacakan, bukan data nyata. */}
          <aside className="card hud page-in" aria-label="Contoh tampilan pelacakan laporan">
            <div className="hud-head">
              <span className="hud-ticket">SGC-20261111-A7K2QX</span>
              <span className="hud-tag">Contoh tampilan</span>
            </div>
            <div className="hud-title">Lampu jalan mati di depan SDN 2</div>
            <ul className="timeline">
              <li>
                <span className="badge badge-baru">Baru</span>
                <div className="when">Laporan diterima sistem</div>
              </li>
              <li>
                <span className="badge badge-diverifikasi">Terverifikasi</span>
                <div className="when">Petugas memeriksa lokasi</div>
              </li>
              <li>
                <span className="badge badge-diproses">Sedang Diproses</span>
                <div className="when">Teknisi dijadwalkan</div>
              </li>
            </ul>
          </aside>
        </div>

        <div className="hero-skyline" aria-hidden="true">
          <CityScape />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Satu platform, tiga peran</h2>
            <p>Setiap pengguna melihat dan melakukan hanya yang menjadi tugasnya.</p>
          </div>
          <div className="grid-3">
            <article className="card feature">
              <div className="ico">{ICON.warga}</div>
              <h3>Warga</h3>
              <ul>
                <li>Daftar dan buat pengaduan</li>
                <li>Isi lokasi kejadian</li>
                <li>Lacak status dengan nomor tiket</li>
                <li>Opsi melapor tanpa nama ke petugas</li>
              </ul>
            </article>
            <article className="card feature">
              <div className="ico">{ICON.petugas}</div>
              <h3>Petugas Kelurahan</h3>
              <ul>
                <li>Lihat laporan yang masuk</li>
                <li>Verifikasi dan perbarui status</li>
                <li>Beri catatan tindak lanjut</li>
              </ul>
            </article>
            <article className="card feature">
              <div className="ico">{ICON.admin}</div>
              <h3>Admin</h3>
              <ul>
                <li>Kelola pengguna dan peran</li>
                <li>Kelola kategori pengaduan</li>
                <li>Pantau statistik laporan</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>Alur pengaduan</h2>
          </div>
          <ol className="pipeline">
            <li><strong>Laporkan</strong><span>Tulis masalah dan lokasinya. Sistem memberi nomor tiket.</span></li>
            <li><strong>Verifikasi</strong><span>Petugas memeriksa laporan dan memperbarui statusnya.</span></li>
            <li><strong>Tindak lanjut</strong><span>Petugas mencatat langkah yang diambil hingga selesai.</span></li>
            <li><strong>Pantau</strong><span>Anda melihat seluruh riwayat status kapan saja.</span></li>
          </ol>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">SmartGov Connect &middot; Platform pengaduan warga</div>
      </footer>
    </>
  );
}
