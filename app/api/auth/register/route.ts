import type { ResultSetHeader } from "mysql2";
import { bcrypt, createSessionToken, setSessionCookie } from "@/lib/auth";
import { isDuplicate, pool } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { registerSchema } from "@/lib/validation";

// Pendaftaran publik hanya membuat akun WARGA. Petugas dan admin dibuat oleh admin.
export async function POST(req: Request) {
  return run(async () => {
    const data = registerSchema.parse(await readJson(req));
    const hash = await bcrypt.hash(data.password, 12);

    try {
      const [res] = await pool().query<ResultSetHeader>(
        "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'warga')",
        [data.name, data.email, data.phone || null, hash]
      );
      setSessionCookie(await createSessionToken({ id: res.insertId, role: "warga" }));
      return ok({ user: { id: res.insertId, name: data.name, email: data.email, role: "warga" } }, 201);
    } catch (err) {
      if (isDuplicate(err)) throw new HttpError(409, "Email sudah terdaftar. Silakan masuk.");
      throw err;
    }
  });
}
