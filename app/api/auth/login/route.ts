import type { RowDataPacket } from "mysql2";
import { bcrypt, burnPasswordCheck, createSessionToken, setSessionCookie } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { clientIp, rateLimit, rateReset } from "@/lib/ratelimit";
import type { Role } from "@/lib/types";
import { loginSchema } from "@/lib/validation";

interface LoginRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
}

export async function POST(req: Request) {
  return run(async () => {
    const data = loginSchema.parse(await readJson(req));
    const emailKey = `login:email:${data.email}`;
    await rateLimit(`login:ip:${clientIp(req)}`, 30, 15 * 60);
    await rateLimit(emailKey, 8, 15 * 60);
    const rows = await query<LoginRow>(
      "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
      [data.email]
    );
    const user = rows[0];

    const valid = user ? await bcrypt.compare(data.password, user.password_hash) : (await burnPasswordCheck(data.password), false);
    if (!user || !valid) throw new HttpError(401, "Email atau kata sandi salah.");
    if (!user.is_active) throw new HttpError(403, "Akun dinonaktifkan. Hubungi admin kelurahan.");
    if (user.role !== "petugas" && user.role !== "admin") {
      throw new HttpError(403, "Login hanya tersedia untuk Petugas Kelurahan dan Admin.");
    }

    await rateReset(emailKey);
    setSessionCookie(await createSessionToken({ id: user.id, role: user.role as Role }));
    return ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
}
