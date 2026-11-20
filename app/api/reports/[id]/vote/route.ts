import type { RowDataPacket } from "mysql2";
import { pool, query } from "@/lib/db";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

async function openReport(id: number) {
  const rows = await query<RowDataPacket & { status: string }>("SELECT status FROM reports WHERE id = ? LIMIT 1", [id]);
  const r = rows[0];
  if (!r) throw new HttpError(404, "Laporan tidak ditemukan.");
  return r;
}

async function count(id: number): Promise<number> {
  const rows = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM report_votes WHERE report_id = ?", [id]);
  return Number(rows[0]?.n ?? 0);
}

export async function POST(req: Request, { params }: Ctx) {
  return run(async () => {
    const id = parseId(params.id);
    await rateLimit(`vote:ip:${clientIp(req)}`, 60, 60 * 60);
    const body = (await readJson(req).catch(() => ({}))) as { voter_key?: string };
    const voterKey = (body.voter_key || clientIp(req)).slice(0, 64);

    const rep = await openReport(id);
    if (!["baru", "diverifikasi", "diproses"].includes(rep.status)) {
      throw new HttpError(409, "Laporan ini sudah ditutup.");
    }
    await pool().query("INSERT IGNORE INTO report_votes (report_id, voter_key) VALUES (?, ?)", [id, voterKey]);
    return ok({ votes: await count(id), voted: true });
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return run(async () => {
    const id = parseId(params.id);
    const url = new URL(req.url);
    const voterKey = (url.searchParams.get("voter_key") || clientIp(req)).slice(0, 64);
    await openReport(id);
    await query("DELETE FROM report_votes WHERE report_id = ? AND voter_key = ?", [id, voterKey]);
    return ok({ votes: await count(id), voted: false });
  });
}
