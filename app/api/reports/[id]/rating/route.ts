import type { RowDataPacket } from "mysql2";
import { pool, query } from "@/lib/db";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { hashDeviceToken } from "@/lib/reports";
import { ratingSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return run(async () => {
    const id = parseId(params.id);
    const data = ratingSchema.parse(await readJson(req));
    const tokenHash = hashDeviceToken(data.device_token);

    const rows = await query<RowDataPacket & { status: string; device_token_hash: string }>(
      "SELECT status, device_token_hash FROM reports WHERE id = ? LIMIT 1",
      [id]
    );
    const rep = rows[0];
    if (!rep) throw new HttpError(404, "Laporan tidak ditemukan.");
    if (!rep.device_token_hash || rep.device_token_hash !== tokenHash) {
      throw new HttpError(403, "Penilaian hanya dapat dikirim dari perangkat yang membuat laporan ini.");
    }
    if (rep.status !== "selesai") {
      throw new HttpError(409, "Penilaian dapat diberikan setelah laporan selesai.");
    }

    await pool().query(
      `INSERT INTO report_ratings (report_id, stars, comment) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stars = VALUES(stars), comment = VALUES(comment)`,
      [id, data.stars, data.comment || null]
    );
    return ok({ rating: { stars: data.stars, comment: data.comment || null } });
  });
}
