import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { HttpError, ok, parseId, run } from "@/lib/http";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MILESTONES = [3, 5, 10, 25, 50];

type Ctx = { params: { id: string } };

async function openReport(id: number) {
  const rows = await query<RowDataPacket & { user_id: number; status: string; ticket_no: string }>(
    "SELECT user_id, status, ticket_no FROM reports WHERE id = ? LIMIT 1",
    [id]
  );
  const r = rows[0];
  if (!r) throw new HttpError(404, "Laporan tidak ditemukan.");
  return r;
}

async function count(id: number): Promise<number> {
  const rows = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM report_votes WHERE report_id = ?", [id]);
  return Number(rows[0]?.n ?? 0);
}

// Warga mendukung laporan orang lain yang masih berjalan (mis. masalah yang sama).
export async function POST(_req: Request, { params }: Ctx) {
  return run(async () => {
    const user = await requireUser(["warga"]);
    const id = parseId(params.id);
    await rateLimit(`vote:user:${user.id}`, 60, 60 * 60);
    const rep = await openReport(id);
    if (rep.user_id === user.id) throw new HttpError(409, "Anda tidak dapat mendukung laporan Anda sendiri.");
    if (!["baru", "diverifikasi", "diproses"].includes(rep.status)) {
      throw new HttpError(409, "Laporan ini sudah ditutup.");
    }

    const total = await withTransaction(async (conn) => {
      const [res] = await conn.query<ResultSetHeader>(
        "INSERT IGNORE INTO report_votes (report_id, user_id) VALUES (?, ?)",
        [id, user.id]
      );
      const [cnt] = await conn.query<(RowDataPacket & { n: number })[]>(
        "SELECT COUNT(*) AS n FROM report_votes WHERE report_id = ?",
        [id]
      );
      const n = Number(cnt[0]?.n ?? 0);
      if (res.affectedRows === 1 && MILESTONES.includes(n)) {
        await notify(conn, rep.user_id, id, `Laporan ${rep.ticket_no} kini didukung ${n} warga.`);
      }
      return n;
    });
    return ok({ votes: total, voted: true });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return run(async () => {
    const user = await requireUser(["warga"]);
    const id = parseId(params.id);
    await rateLimit(`vote:user:${user.id}`, 60, 60 * 60);
    await openReport(id);
    await query("DELETE FROM report_votes WHERE report_id = ? AND user_id = ?", [id, user.id]);
    return ok({ votes: await count(id), voted: false });
  });
}
