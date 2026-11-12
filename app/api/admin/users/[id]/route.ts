import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { pool, query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { adminUserPatchSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return run(async () => {
    const admin = await requireUser(["admin"]);
    const id = parseId(params.id);
    const data = adminUserPatchSchema.parse(await readJson(req));

    // Cegah admin mengunci dirinya sendiri.
    if (id === admin.id) {
      if (data.is_active === false) throw new HttpError(400, "Anda tidak dapat menonaktifkan akun sendiri.");
      if (data.role && data.role !== "admin") throw new HttpError(400, "Anda tidak dapat menurunkan peran akun sendiri.");
    }

    const exists = await query<RowDataPacket>("SELECT id FROM users WHERE id = ? LIMIT 1", [id]);
    if (!exists[0]) throw new HttpError(404, "Pengguna tidak ditemukan.");

    const sets: string[] = [];
    const params2: unknown[] = [];
    if (data.role !== undefined) {
      sets.push("role = ?");
      params2.push(data.role);
    }
    if (data.is_active !== undefined) {
      sets.push("is_active = ?");
      params2.push(data.is_active ? 1 : 0);
    }
    await pool().query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...params2, id]);
    await audit(admin.id, "user.update", { type: "user", id }, [data.role !== undefined && `peran=${data.role}`, data.is_active !== undefined && `aktif=${data.is_active}`].filter(Boolean).join(", "));
    return ok({ success: true });
  });
}
