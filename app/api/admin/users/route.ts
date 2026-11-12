import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { bcrypt, requireUser } from "@/lib/auth";
import { isDuplicate, pool, query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { HttpError, ok, readJson, run } from "@/lib/http";
import type { Role } from "@/lib/types";
import { adminUserCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface UserListRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: number;
  created_at: Date;
}

export async function GET() {
  return run(async () => {
    await requireUser(["admin"]);
    const rows = await query<UserListRow>(
      "SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 500"
    );
    return ok({
      users: rows.map((u) => ({
        ...u,
        is_active: Boolean(u.is_active),
        created_at: new Date(u.created_at).toISOString(),
      })),
    });
  });
}

// Admin membuat akun petugas/admin/warga secara langsung.
export async function POST(req: Request) {
  return run(async () => {
    const admin = await requireUser(["admin"]);
    const data = adminUserCreateSchema.parse(await readJson(req));
    const hash = await bcrypt.hash(data.password, 12);
    try {
      const [res] = await pool().query<ResultSetHeader>(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [data.name, data.email, hash, data.role]
      );
      await audit(admin.id, "user.create", { type: "user", id: res.insertId }, `${data.email} (${data.role})`);
      return ok({ id: res.insertId }, 201);
    } catch (err) {
      if (isDuplicate(err)) throw new HttpError(409, "Email sudah terdaftar.");
      throw err;
    }
  });
}
