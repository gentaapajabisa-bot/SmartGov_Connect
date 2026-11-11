import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, run } from "@/lib/http";

export const dynamic = "force-dynamic";

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
}

export async function GET() {
  return run(async () => {
    await requireUser();
    const rows = await query<CategoryRow>(
      "SELECT id, name, description FROM categories WHERE is_active = 1 ORDER BY name"
    );
    return ok({ categories: rows.map((r) => ({ ...r, is_active: true })) });
  });
}
