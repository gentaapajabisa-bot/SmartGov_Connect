import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { isDuplicate, pool, query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { categoryCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  sla_hours: number;
  is_active: number;
}

// Admin melihat semua kategori, termasuk yang nonaktif.
export async function GET() {
  return run(async () => {
    await requireUser(["admin"]);
    const rows = await query<Row>("SELECT id, name, description, sla_hours, is_active FROM categories ORDER BY name");
    return ok({ categories: rows.map((r) => ({ ...r, is_active: Boolean(r.is_active) })) });
  });
}

export async function POST(req: Request) {
  return run(async () => {
    const admin = await requireUser(["admin"]);
    const data = categoryCreateSchema.parse(await readJson(req));
    try {
      const [res] = await pool().query<ResultSetHeader>(
        "INSERT INTO categories (name, description, sla_hours) VALUES (?, ?, ?)",
        [data.name, data.description || null, data.sla_hours ?? 168]
      );
      await audit(admin.id, "category.create", { type: "category", id: res.insertId }, data.name);
      return ok({ id: res.insertId }, 201);
    } catch (err) {
      if (isDuplicate(err)) throw new HttpError(409, "Nama kategori sudah ada.");
      throw err;
    }
  });
}
