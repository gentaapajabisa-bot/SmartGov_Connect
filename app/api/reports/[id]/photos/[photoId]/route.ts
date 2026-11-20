import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { HttpError, parseId, run } from "@/lib/http";

export const dynamic = "force-dynamic";

interface PhotoRow extends RowDataPacket {
  mime: string;
  data: Buffer;
}

export async function GET(_req: Request, { params }: { params: { id: string; photoId: string } }) {
  return run(async () => {
    const reportId = parseId(params.id);
    const photoId = parseId(params.photoId);

    const rows = await query<PhotoRow>(
      "SELECT mime, data FROM report_photos WHERE id = ? AND report_id = ? LIMIT 1",
      [photoId, reportId]
    );
    const row = rows[0];
    if (!row) throw new HttpError(404, "Foto tidak ditemukan.");

    return new Response(new Uint8Array(row.data), {
      headers: {
        "Content-Type": row.mime,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
