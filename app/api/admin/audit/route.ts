import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, run } from "@/lib/http";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  id: number;
  actor: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: string | null;
  created_at: Date;
}

export async function GET() {
  return run(async () => {
    await requireUser(["admin"]);
    const rows = await query<Row>(
      `SELECT l.id, u.name AS actor, l.action, l.target_type, l.target_id, l.detail, l.created_at
         FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id
        ORDER BY l.id DESC LIMIT 200`
    );
    return ok({ entries: rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() })) });
  });
}
