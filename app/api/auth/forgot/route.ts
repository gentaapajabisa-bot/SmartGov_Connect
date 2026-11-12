import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { ok, readJson, run } from "@/lib/http";
import { sendResetEmail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createToken } from "@/lib/tokens";
import { forgotSchema } from "@/lib/validation";

interface Row extends RowDataPacket {
  id: number;
  name: string;
}

// Selalu menjawab sama, terdaftar atau tidak, agar tidak membocorkan email mana yang punya akun.
export async function POST(req: Request) {
  return run(async () => {
    await rateLimit(`forgot:ip:${clientIp(req)}`, 10, 60 * 60);
    const { email } = forgotSchema.parse(await readJson(req));
    await rateLimit(`forgot:email:${email}`, 3, 60 * 60);

    const rows = await query<Row>("SELECT id, name FROM users WHERE email = ? AND is_active = 1 LIMIT 1", [email]);
    const user = rows[0];
    if (user) {
      try {
        await sendResetEmail(req, email, user.name, await createToken(user.id, "reset", 60));
      } catch (err) {
        console.error("[forgot] gagal:", err);
      }
    }
    return ok({ message: "Jika email terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim." });
  });
}
