import Link from "next/link";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

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
        <div className="container">
          <h1>Suara warga, tindak lanjut yang terlihat.</h1>
          <p className="lead">
            SmartGov Connect menghubungkan warga dengan petugas kelurahan. Laporkan masalah lingkungan,
            dapatkan nomor tiket, dan pantau setiap perkembangannya.
          </p>
          <div className="actions">
            {user ? (
              <Link href="/dashboard" className="btn btn-accent">Buka Dashboard</Link>
            ) : (
              <>
                <Link href="/register" className="btn btn-accent">Buat Pengaduan</Link>
                <Link href="/login" className="btn btn-ghost">Masuk</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Untuk siapa?</h2>
          <div className="grid-3">
            <article className="card">
              <h3>Warga</h3>
              <ul>
                <li>Daftar dan buat pengaduan</li>
                <li>Isi lokasi kejadian</li>
                <li>Lacak status dengan nomor tiket</li>
                <li>Opsi melapor tanpa nama ke petugas</li>
              </ul>
            </article>
            <article className="card">
              <h3>Petugas Kelurahan</h3>
              <ul>
                <li>Lihat laporan yang masuk</li>
                <li>Verifikasi dan perbarui status</li>
                <li>Beri catatan tindak lanjut</li>
              </ul>
            </article>
            <article className="card">
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
          <h2>Alur pengaduan</h2>
          <ol className="steps">
            <li><div><strong>Laporkan.</strong> Tulis masalah dan lokasinya. Sistem memberi nomor tiket.</div></li>
            <li><div><strong>Verifikasi.</strong> Petugas memeriksa laporan dan memperbarui statusnya.</div></li>
            <li><div><strong>Tindak lanjut.</strong> Petugas mencatat langkah yang diambil hingga selesai.</div></li>
            <li><div><strong>Pantau.</strong> Anda melihat seluruh riwayat status kapan saja.</div></li>
          </ol>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">SmartGov Connect &middot; Platform pengaduan warga</div>
      </footer>
    </>
  );
}
