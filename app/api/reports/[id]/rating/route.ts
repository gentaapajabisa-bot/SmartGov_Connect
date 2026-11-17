import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { pool, query } from "@/lib/db";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { ratingSchema } from "@/lib/validation";

// Pelapor menilai penanganan setelah laporan berstatus Selesai. Penilaian dapat diperbarui.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return run(async () => {
    const user = await requireUser(["warga"]);
    const id = parseId(params.id);
    const data = ratingSchema.parse(await readJson(req));

    const rows = await query<RowDataPacket & { status: string }>(
      "SELECT status FROM reports WHERE id = ? AND user_id = ? LIMIT 1",
      [id, user.id]
    );
    if (!rows[0]) throw new HttpError(404, "Laporan tidak ditemukan.");
    if (rows[0].status !== "selesai") throw new HttpError(409, "Penilaian dapat diberikan setelah laporan selesai.");

    await pool().query(
      `INSERT INTO report_ratings (report_id, user_id, stars, comment) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE stars = VALUES(stars), comment = VALUES(comment)`,
      [id, user.id, data.stars, data.comment || null]
    );
    return ok({ rating: { stars: data.stars, comment: data.comment || null } });
  });
}
