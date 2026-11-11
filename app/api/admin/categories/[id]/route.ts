import { requireUser } from "@/lib/auth";
import { isDuplicate, pool } from "@/lib/db";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { categoryPatchSchema } from "@/lib/validation";

// Kategori tidak dihapus agar riwayat laporan tetap utuh; cukup dinonaktifkan.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return run(async () => {
    await requireUser(["admin"]);
    const id = parseId(params.id);
    const data = categoryPatchSchema.parse(await readJson(req));

    const sets: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) {
      sets.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push("description = ?");
      values.push(data.description || null);
    }
    if (data.is_active !== undefined) {
      sets.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    try {
      const [res] = await pool().query<import("mysql2").ResultSetHeader>(
        `UPDATE categories SET ${sets.join(", ")} WHERE id = ?`,
        [...values, id]
      );
      if (res.affectedRows === 0) throw new HttpError(404, "Kategori tidak ditemukan.");
    } catch (err) {
      if (isDuplicate(err)) throw new HttpError(409, "Nama kategori sudah ada.");
      throw err;
    }
    return ok({ success: true });
  });
}
