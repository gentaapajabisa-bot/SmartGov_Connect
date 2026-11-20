import { pool } from "@/lib/db";
import PublicReportForm from "@/components/PublicReportForm";
import EmergencyBar from "@/components/EmergencyBar";

export const dynamic = "force-dynamic";

export default async function LaporPage() {
  let categories: any[] = [];
  try {
    const [rows]: any = await pool.query(
      `SELECT c.id, c.name, a.short_name AS agency_name
       FROM categories c
       LEFT JOIN agencies a ON c.agency_id = a.id
       WHERE c.is_active = 1
       ORDER BY c.id ASC`
    );
    categories = rows;
  } catch {
    categories = [];
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Layanan Pengaduan Warga Kabupaten Purbalingga</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Sampaikan laporan jalan rusak, fasilitas umum, atau kejadian meresahkan secara anonim.
        </p>
      </div>

      <PublicReportForm categories={categories} />
      <EmergencyBar />
    </main>
  );
}
