import { NextResponse } from "next/server";
import * as dbMod from "@/lib/db";

const PURBALINGGA_AGENCIES = [
  { id: 1, code: "DISKOMINFO", name: "Dinas Komunikasi dan Informatika Kabupaten Purbalingga", short_name: "Diskominfo Purbalingga" },
  { id: 2, code: "DPUPR", name: "Dinas Pekerjaan Umum dan Penataan Ruang Kabupaten Purbalingga", short_name: "DPUPR Purbalingga" },
  { id: 3, code: "SATPOLPP", name: "Satuan Polisi Pamong Praja Kabupaten Purbalingga", short_name: "Satpol PP Purbalingga" },
  { id: 4, code: "DINHUB", name: "Dinas Perhubungan Kabupaten Purbalingga", short_name: "Dinhub Purbalingga" },
  { id: 5, code: "DLH", name: "Dinas Lingkungan Hidup Kabupaten Purbalingga", short_name: "DLH Purbalingga" },
  { id: 6, code: "BPBD", name: "Badan Penanggulangan Bencana Daerah Kabupaten Purbalingga", short_name: "BPBD Purbalingga" },
  { id: 7, code: "DAMKAR", name: "Pemadam Kebakaran dan Penyelamatan Kabupaten Purbalingga", short_name: "Damkar Purbalingga" },
  { id: 8, code: "POLRES", name: "Kepolisian Resor (Polres) Purbalingga", short_name: "Polres Purbalingga" },
  { id: 9, code: "RSUD", name: "RSUD dr. R. Goeteng Taroenadibrata Kabupaten Purbalingga", short_name: "RSUD Goeteng Purbalingga" },
  { id: 10, code: "KECAMATAN", name: "Koordinator Wilayah Kecamatan se-Kabupaten Purbalingga", short_name: "Kecamatan Purbalingga" },
];

export async function GET() {
  try {
    const getPool = (dbMod as any).pool || (dbMod as any).getPool || (dbMod as any).default;
    if (typeof getPool === "function") {
      const db = getPool();
      const [rows]: any = await db.query(
        "SELECT id, code, name, short_name FROM agencies WHERE is_active = 1 ORDER BY id ASC"
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json({ agencies: rows });
      }
    }
  } catch {
    // Fallback otomatis ke daftar resmi OPD Kabupaten Purbalingga jika tabel agencies belum dibuat di DB
  }
  return NextResponse.json({ agencies: PURBALINGGA_AGENCIES });
}
