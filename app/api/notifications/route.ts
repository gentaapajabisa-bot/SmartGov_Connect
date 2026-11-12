import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { pool, query } from "@/lib/db";
import { ok, readJson, run } from "@/lib/http";
import type { NotificationItem } from "@/lib/types";
import { notificationPatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  id: number;
  report_id: number | null;
  message: string;
  is_read: number;
  created_at: Date;
}

// Notifikasi milik pengguna yang sedang masuk (30 terbaru) + jumlah yang belum dibaca.
export async function GET() {
  return run(async () => {
    const user = await requireUser();
    const [rows, unread] = await Promise.all([
      query<Row>(
        "SELECT id, report_id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30",
        [user.id]
      ),
      query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0", [
        user.id,
      ]),
    ]);
    const items: NotificationItem[] = rows.map((r) => ({
      id: r.id,
      report_id: r.report_id,
      message: r.message,
      is_read: Boolean(r.is_read),
      created_at: new Date(r.created_at).toISOString(),
    }));
    return ok({ items, unread: Number(unread[0].n) });
  });
}

// Tandai satu atau semua notifikasi sebagai sudah dibaca (selalu dibatasi pada pemilik).
export async function PATCH(req: Request) {
  return run(async () => {
    const user = await requireUser();
    const data = notificationPatchSchema.parse(await readJson(req));
    if (data.all) {
      await pool().query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [user.id]);
    } else {
      await pool().query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [data.id, user.id]);
    }
    return ok({ success: true });
  });
}
