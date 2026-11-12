import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, parseId, run } from "@/lib/http";

export const dynamic = "force-dynamic";

interface PhotoRow extends RowDataPacket {
  mime: string;
  data: Buffer;
  owner_id: number;
}

// Menyajikan foto hanya kepada pelapor (pemilik) dan staf. Tidak ada URL publik.
export async function GET(_req: Request, { params }: { params: { id: string; photoId: string } }) {
  return run(async () => {
    const user = await requireUser();
    const reportId = parseId(params.id);
    const photoId = parseId(params.photoId);

    const rows = await query<PhotoRow>(
      `SELECT p.mime, p.data, r.user_id AS owner_id
         FROM report_photos p JOIN reports r ON r.id = p.report_id
        WHERE p.id = ? AND p.report_id = ? LIMIT 1`,
      [photoId, reportId]
    );
    const row = rows[0];
    if (!row || (user.role === "warga" && row.owner_id !== user.id)) throw new HttpError(404, "Foto tidak ditemukan.");

    return new Response(new Uint8Array(row.data), {
      headers: {
        "Content-Type": row.mime,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
