import type { ResultSetHeader } from "mysql2";
import { bcrypt, createSessionToken, setSessionCookie } from "@/lib/auth";
import { isDuplicate, pool } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { sendVerificationEmail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createToken } from "@/lib/tokens";
import { registerSchema } from "@/lib/validation";

// Pendaftaran publik hanya membuat akun WARGA. Petugas dan admin dibuat oleh admin.
export async function POST(req: Request) {
  return run(async () => {
    await rateLimit(`register:ip:${clientIp(req)}`, 10, 60 * 60);
    const data = registerSchema.parse(await readJson(req));
    const hash = await bcrypt.hash(data.password, 12);

    let id: number;
    try {
      const [res] = await pool().query<ResultSetHeader>(
        "INSERT INTO users (name, email, phone, password_hash, role, consent_at) VALUES (?, ?, ?, ?, 'warga', UTC_TIMESTAMP())",
        [data.name, data.email, data.phone || null, hash]
      );
      id = res.insertId;
    } catch (err) {
      if (isDuplicate(err)) throw new HttpError(409, "Email sudah terdaftar. Silakan masuk.");
      throw err;
    }

    // Email verifikasi bersifat pelengkap: kegagalan mengirim tidak membatalkan pendaftaran.
    try {
      await sendVerificationEmail(req, data.email, data.name, await createToken(id, "verify", 24 * 60));
    } catch (err) {
      console.error("[register] verifikasi email gagal:", err);
    }

    setSessionCookie(await createSessionToken({ id, role: "warga" }));
    return ok({ user: { id, name: data.name, email: data.email, role: "warga" } }, 201);
  });
}
