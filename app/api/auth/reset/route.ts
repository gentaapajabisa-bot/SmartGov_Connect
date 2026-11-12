import { bcrypt } from "@/lib/auth";
import { pool } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { consumeToken } from "@/lib/tokens";
import { resetSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return run(async () => {
    await rateLimit(`reset:ip:${clientIp(req)}`, 20, 60 * 60);
    const data = resetSchema.parse(await readJson(req));
    const userId = await consumeToken(data.token, "reset");
    if (!userId) throw new HttpError(400, "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.");

    const hash = await bcrypt.hash(data.password, 12);
    // Menerima email berisi tautan ini juga membuktikan kepemilikan email.
    await pool().query(
      "UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?",
      [hash, userId]
    );
    return ok({ message: "Kata sandi diperbarui. Silakan masuk." });
  });
}
