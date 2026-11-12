import Link from "next/link";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Kebijakan Privasi - SmartGov Connect" };

export default async function PrivacyPage() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <>
      <Header user={user} />
      <main className="container page-in" style={{ maxWidth: 820, padding: "28px 0 60px" }}>
        <h1>Kebijakan Privasi</h1>
        <p className="muted">
          Ringkasan cara SmartGov Connect memperlakukan data pribadi Anda, mengacu pada UU No. 27 Tahun 2022 tentang
          Pelindungan Data Pribadi. Naskah ini adalah templat: sesuaikan nama instansi, kontak, dan masa simpan dengan
          kebijakan kelurahan Anda dan konsultasikan dengan bagian hukum sebelum dipakai resmi.
        </p>

        <div className="card" style={{ marginTop: 18 }}>
          <h2>Data yang kami kumpulkan</h2>
          <ul>
            <li>Akun: nama, email, nomor HP (opsional), dan kata sandi yang disimpan dalam bentuk hash.</li>
            <li>Laporan: judul, uraian, kategori, lokasi (teks dan koordinat bila Anda tandai di peta), serta foto yang Anda unggah.</li>
            <li>Teknis: alamat IP sementara untuk pembatasan percobaan masuk, dan cookie sesi.</li>
          </ul>

          <h2>Tujuan penggunaan</h2>
          <p>Data dipakai untuk memproses dan menindaklanjuti pengaduan, memberi pembaruan status, mengamankan akun, dan menyusun statistik layanan.</p>

          <h2>Siapa yang dapat melihat</h2>
          <ul>
            <li>Warga hanya melihat laporan miliknya sendiri.</li>
            <li>Petugas dan admin kelurahan melihat laporan untuk menindaklanjuti. Pada laporan anonim, nama pelapor disembunyikan dari petugas.</li>
            <li>Email dan nomor HP tidak ditampilkan pada daftar maupun detail laporan.</li>
            <li>Tindakan admin dicatat dalam log audit.</li>
          </ul>

          <h2>Hak Anda</h2>
          <p>Anda dapat meminta akses, perbaikan, atau penghapusan data pribadi dengan menghubungi admin kelurahan. Penghapusan dapat dibatasi bila data diperlukan untuk kewajiban pencatatan layanan publik.</p>

          <h2>Penyimpanan dan keamanan</h2>
          <p>Data disimpan di basis data terenkripsi saat transit (TLS). Akses dibatasi menurut peran. Meski demikian tidak ada sistem yang sepenuhnya bebas risiko; laporkan dugaan penyalahgunaan kepada admin.</p>

          <h2>Kontak</h2>
          <p>[Isi dengan nama kelurahan, alamat, dan email pejabat pelindungan data.]</p>
        </div>
        <p style={{ marginTop: 18 }}><Link href="/">Kembali ke beranda</Link></p>
      </main>
    </>
  );
}
