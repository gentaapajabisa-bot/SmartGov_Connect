import Link from "next/link";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const ICON = {
  warga: (
    <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  petugas: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15v-3M12 15V9M17 15v-5" /></svg>
  ),
};

export default async function Home() {
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
            <span className="eyebrow">Smart City &middot; Layanan Pengaduan Anonim</span>
            <h1>
              Suara warga, <span className="gradient-text">tindak lanjut</span> yang terlihat.
            </h1>
            <p className="lead">
              SmartGov Connect menghubungkan warga dengan petugas kelurahan secara anonim tanpa perlu login.
              Kirim aduan tanpa meninggalkan identitas pribadi, dapatkan kode tiket, dan pantau penanganannya secara transparan.
            </p>
            <div className="actions">
              <Link href="/lapor" className="btn btn-lg">Buat Pengaduan Anonim</Link>
              {user ? (
                <Link href="/dashboard" className="btn btn-ghost btn-lg">Dashboard Staf</Link>
              ) : (
                <Link href="/login" className="btn btn-ghost btn-lg">Masuk Petugas / Admin</Link>
              )}
            </div>
          </div>

          <aside className="card hud page-in" aria-label="Contoh tampilan pelacakan laporan">
            <div className="hud-head">
              <span className="hud-ticket">#SGC-20261120-A7K2QX</span>
              <span className="hud-tag">100% Anonim</span>
            </div>
            <div className="hud-title">Lampu jalan mati di depan SDN 2</div>
            <ul className="timeline">
              <li>
                <span className="badge badge-baru">Baru</span>
                <div className="when">Laporan anonim diterima sistem</div>
              </li>
              <li>
                <span className="badge badge-diverifikasi">Terverifikasi</span>
                <div className="when">Petugas memeriksa lokasi</div>
              </li>
              <li>
                <span className="badge badge-diproses">Sedang Diproses</span>
                <div className="when">Teknisi dijadwalkan ke lapangan</div>
              </li>
              <li>
                <span className="badge badge-selesai">Selesai</span>
                <div className="when">Lampu menyala kembali &middot; Bukti foto terunggah</div>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Tiga Peran, Satu Alur Kerja</h2>
            <p>Privasi warga terlindungi penuh sementara petugas dan admin bekerja cepat memantau penyelesaian.</p>
          </div>
          <div className="grid-3">
            <div className="card feature">
              <div className="ico">{ICON.warga}</div>
              <h3>Warga (Tanpa Login)</h3>
              <p className="muted">
                Lapor langsung tanpa akun, tanpa nama, email, atau nomor HP. Lacak progres dan beri rating cukup dengan kode tiket.
              </p>
            </div>
            <div className="card feature">
              <div className="ico">{ICON.petugas}</div>
              <h3>Petugas Kelurahan</h3>
              <p className="muted">
                Menerima antrean laporan masuk, memperbarui status penanganan, dan mengunggah foto bukti penyelesaian.
              </p>
            </div>
            <div className="card feature">
              <div className="ico">{ICON.admin}</div>
              <h3>Admin</h3>
              <p className="muted">
                Memantau SLA, tren pengaduan harian, kinerja petugas, serta mengelola kategori dan akun internal.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span>SmartGov Connect &middot; Layanan Pengaduan Warga Anonim</span>
          <Link href="/privasi">Kebijakan Privasi & Anonimitas</Link>
        </div>
      </footer>
    </>
  );
}
