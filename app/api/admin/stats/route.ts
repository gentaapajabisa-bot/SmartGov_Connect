import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, run } from "@/lib/http";
import type { Role, Stats, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 14, 30, 90];

// Statistik dengan filter periode (days) dan kategori (category_id, opsional).
export async function GET(req: Request) {
  return run(async () => {
    await requireUser(["admin"]);
    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get("days"));
    const days = ALLOWED_DAYS.includes(daysParam) ? daysParam : 14;
    const catParam = Number(url.searchParams.get("category_id"));
    const categoryId = Number.isInteger(catParam) && catParam > 0 ? catParam : null;

    // Semua angka laporan dibatasi pada rentang waktu dan (bila ada) kategori yang dipilih.
    const scope = `r.created_at >= (UTC_TIMESTAMP() - INTERVAL ${days} DAY)${categoryId ? " AND r.category_id = ?" : ""}`;
    const sp = categoryId ? [categoryId] : [];

    const [byStatus, byCategory, byRole, daily, resolve, unassigned, workload] = await Promise.all([
      query<RowDataPacket & { status: Status; n: number }>(
        `SELECT r.status, COUNT(*) AS n FROM reports r WHERE ${scope} GROUP BY r.status`,
        sp
      ),
      query<RowDataPacket & { name: string; n: number }>(
        `SELECT c.name, COUNT(r.id) AS n
           FROM categories c LEFT JOIN reports r ON r.category_id = c.id AND r.created_at >= (UTC_TIMESTAMP() - INTERVAL ${days} DAY)
          ${categoryId ? "WHERE c.id = ?" : ""}
          GROUP BY c.id, c.name ORDER BY n DESC, c.name`,
        sp
      ),
      query<RowDataPacket & { role: Role; n: number }>("SELECT role, COUNT(*) AS n FROM users GROUP BY role"),
      query<RowDataPacket & { d: Date | string; n: number }>(
        `SELECT DATE(r.created_at) AS d, COUNT(*) AS n FROM reports r WHERE ${scope} GROUP BY DATE(r.created_at) ORDER BY d`,
        sp
      ),
      query<RowDataPacket & { avg_min: string | null }>(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, r.created_at, d.done_at)) AS avg_min
           FROM reports r
           JOIN (SELECT report_id, MIN(created_at) AS done_at FROM report_status_history WHERE status = 'selesai' GROUP BY report_id) d
             ON d.report_id = r.id
          WHERE ${scope}`,
        sp
      ),
      query<RowDataPacket & { n: number }>(
        `SELECT COUNT(*) AS n FROM reports r WHERE r.assigned_to IS NULL AND r.status IN ('baru','diverifikasi','diproses')${categoryId ? " AND r.category_id = ?" : ""}`,
        sp
      ),
      query<RowDataPacket & { name: string; open_n: number; done_n: number }>(
        `SELECT u.name,
                SUM(CASE WHEN r.status IN ('baru','diverifikasi','diproses') THEN 1 ELSE 0 END) AS open_n,
                SUM(CASE WHEN r.status = 'selesai' THEN 1 ELSE 0 END) AS done_n
           FROM reports r JOIN users u ON u.id = r.assigned_to
          WHERE ${scope}
          GROUP BY u.id, u.name ORDER BY open_n DESC, u.name`,
        sp
      ),
    ]);

    const avgMin = resolve[0]?.avg_min;
    const stats: Stats = {
      days,
      categoryId,
      avgResolveHours: avgMin === null || avgMin === undefined ? null : Math.round((Number(avgMin) / 60) * 10) / 10,
      unassigned: Number(unassigned[0]?.n ?? 0),
      workload: workload.map((w) => ({ name: w.name, open: Number(w.open_n), done: Number(w.done_n) })),
      totals: {
        reports: byStatus.reduce((sum, r) => sum + Number(r.n), 0),
        users: byRole.reduce((sum, r) => sum + Number(r.n), 0),
      },
      byStatus: byStatus.map((r) => ({ status: r.status, n: Number(r.n) })),
      byCategory: byCategory.map((r) => ({ name: r.name, n: Number(r.n) })),
      byRole: byRole.map((r) => ({ role: r.role, n: Number(r.n) })),
      daily: daily.map((r) => ({
        date: typeof r.d === "string" ? r.d.slice(0, 10) : new Date(r.d).toISOString().slice(0, 10),
        n: Number(r.n),
      })),
    };
    return ok({ stats });
  });
}
