import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, run } from "@/lib/http";
import type { Role, Stats, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return run(async () => {
    await requireUser(["admin"]);

    const [byStatus, byCategory, byRole, daily] = await Promise.all([
      query<RowDataPacket & { status: Status; n: number }>("SELECT status, COUNT(*) AS n FROM reports GROUP BY status"),
      query<RowDataPacket & { name: string; n: number }>(
        `SELECT c.name, COUNT(r.id) AS n
           FROM categories c LEFT JOIN reports r ON r.category_id = c.id
          GROUP BY c.id, c.name ORDER BY n DESC, c.name`
      ),
      query<RowDataPacket & { role: Role; n: number }>("SELECT role, COUNT(*) AS n FROM users GROUP BY role"),
      query<RowDataPacket & { d: Date | string; n: number }>(
        `SELECT DATE(created_at) AS d, COUNT(*) AS n
           FROM reports
          WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL 14 DAY)
          GROUP BY DATE(created_at) ORDER BY d`
      ),
    ]);

    const stats: Stats = {
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
