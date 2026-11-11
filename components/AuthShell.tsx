import type { ReactNode } from "react";

// Tata letak halaman masuk/daftar: panel kota di kiri (disembunyikan di layar kecil), form di kanan.
export default function AuthShell({
  heading,
  blurb,
  children,
}: {
  heading: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-visual-copy">
          <span className="eyebrow">Smart City &middot; Layanan Kelurahan</span>
          <h2>
            Kota yang <span className="gradient-text">mendengar</span> warganya.
          </h2>
          <p>Laporkan masalah lingkungan, dapatkan nomor tiket, dan pantau tindak lanjutnya secara transparan.</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="card auth-card page-in">
          <h1>{heading}</h1>
          <p className="muted">{blurb}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
