import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { pool, query } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { whatsappEnabled } from "@/lib/whatsapp";
import { preferencesSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  phone: string | null;
  notify_email: number;
  notify_wa: number;
}

async function snapshot(userId: number, verified: boolean) {
  const rows = await query<Row>("SELECT phone, notify_email, notify_wa FROM users WHERE id = ? LIMIT 1", [userId]);
  const r = rows[0];
  return {
    notify_email: Boolean(r?.notify_email),
    notify_wa: Boolean(r?.notify_wa),
    has_phone: Boolean(r?.phone),
    email_verified: verified,
    email_available: Boolean(process.env.RESEND_API_KEY),
    wa_available: whatsappEnabled(),
  };
}

export async function GET() {
  return run(async () => {
    const user = await requireUser();
    return ok({ prefs: await snapshot(user.id, user.email_verified) });
  });
}

export async function PATCH(req: Request) {
  return run(async () => {
    const user = await requireUser();
    const data = preferencesSchema.parse(await readJson(req));

    if (data.notify_email === true && !user.email_verified) {
      throw new HttpError(409, "Verifikasi email Anda terlebih dahulu agar pembaruan dapat dikirim ke email.");
    }
    if (data.notify_wa === true) {
      if (!whatsappEnabled()) throw new HttpError(409, "Pengiriman WhatsApp belum diaktifkan oleh admin.");
      const rows = await query<Row>("SELECT phone, notify_email, notify_wa FROM users WHERE id = ? LIMIT 1", [user.id]);
      if (!rows[0]?.phone) throw new HttpError(409, "Nomor HP belum tersimpan pada akun Anda.");
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    if (data.notify_email !== undefined) {
      sets.push("notify_email = ?");
      values.push(data.notify_email ? 1 : 0);
    }
    if (data.notify_wa !== undefined) {
      sets.push("notify_wa = ?");
      values.push(data.notify_wa ? 1 : 0);
    }
    await pool().query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...values, user.id]);
    return ok({ prefs: await snapshot(user.id, user.email_verified) });
  });
}
