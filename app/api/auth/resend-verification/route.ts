import { requireUser } from "@/lib/auth";
import { HttpError, ok, run } from "@/lib/http";
import { sendVerificationEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/ratelimit";
import { createToken } from "@/lib/tokens";

export async function POST(req: Request) {
  return run(async () => {
    const user = await requireUser();
    if (user.email_verified) return ok({ message: "Email sudah terverifikasi." });
    await rateLimit(`resend:user:${user.id}`, 3, 60 * 60);
    const sent = await sendVerificationEmail(req, user.email, user.name, await createToken(user.id, "verify", 24 * 60));
    if (!sent) throw new HttpError(503, "Layanan email belum aktif. Hubungi admin kelurahan.");
    return ok({ message: "Email verifikasi dikirim. Periksa kotak masuk Anda." });
  });
}
