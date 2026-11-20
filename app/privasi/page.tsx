import Link from "next/link";
import Header from "@/components/Header";

export const metadata = { title: "Kebijakan Privasi & Anonimitas - SmartGov Connect" };

export default function PrivasiPage() {
  return (
    <>
      <Header />
      <main className="container dash page-in" style={{ maxWidth: 820 }}>
        <div className="card">
          <h1>Kebijakan Privasi &amp; Anonimitas Warga</h1>
          <p className="muted">
            SmartGov Connect dirancang dengan prinsip <strong>Privacy-by-Design</strong> untuk melindungi identitas warga saat menyampaikan pengaduan.
          </p>

          <h3>1. Tanpa Akun &amp; Tanpa Identitas Pribadi Warga</h3>
          <p>
            Warga tidak perlu membuat akun atau login untuk mengirim pengaduan. Formulir pengaduan tidak meminta maupun menyimpan nama lengkap, NIK, alamat email, atau nomor telepon pelapor.
          </p>

          <h3>2. Mekanisme Kode Tiket &amp; Token Perangkat</h3>
          <p>
            Setiap pengaduan menghasilkan nomor tiket unik (<code>SGC-YYYYMMDD-XXXXXX</code>) dan token keamanan lokal yang disimpan hanya di peramban perangkat Anda untuk memantau status serta memberikan penilaian layanan setelah laporan selesai.
          </p>

          <h3>3. Akun Terbatas untuk Petugas &amp; Admin</h3>
          <p>
            Autentikasi login hanya digunakan oleh Petugas Kelurahan dan Admin yang berwenang untuk memproses pengaduan, memperbarui status tindak lanjut, dan memantau kinerja SLA kelurahan.
          </p>

          <p style={{ marginTop: 20 }}>
            <Link href="/lapor" className="btn">Buka Portal Layanan Warga</Link>
          </p>
        </div>
      </main>
    </>
  );
}
