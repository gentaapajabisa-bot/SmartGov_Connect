import { pool } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { consumeToken } from "@/lib/tokens";
import { tokenSchema } from "@/lib/validation";

// Dipanggil lewat POST dari halaman /verify-email (bukan GET) agar pemindai tautan email tidak memakai token.
export async function POST(req: Request) {
  return run(async () => {
    await rateLimit(`verify:ip:${clientIp(req)}`, 30, 60 * 60);
    const { token } = tokenSchema.parse(await readJson(req));
    const userId = await consumeToken(token, "verify");
    if (!userId) throw new HttpError(400, "Tautan tidak valid atau sudah kedaluwarsa.");
    await pool().query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?", [userId]);
    return ok({ message: "Email berhasil diverifikasi." });
  });
}
