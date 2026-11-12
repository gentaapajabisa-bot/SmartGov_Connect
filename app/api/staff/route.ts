import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, run } from "@/lib/http";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

// Daftar staf aktif untuk pilihan penugasan. Hanya id, nama, dan peran; tanpa email/HP.
export async function GET() {
  return run(async () => {
    await requireUser(["petugas", "admin"]);
    const rows = await query<RowDataPacket & { id: number; name: string; role: Role }>(
      "SELECT id, name, role FROM users WHERE is_active = 1 AND role IN ('petugas','admin') ORDER BY name"
    );
    return ok({ staff: rows });
  });
}
