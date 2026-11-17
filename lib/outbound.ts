import type { RowDataPacket } from "mysql2";
import { query } from "./db";
import { appUrl, sendMail } from "./mail";
import { sendWhatsApp, whatsappEnabled } from "./whatsapp";

interface Row extends RowDataPacket {
  name: string;
  email: string;
  phone: string | null;
  notify_email: number;
  notify_wa: number;
  email_verified_at: Date | null;
}

/**
 * Mengirim pembaruan ke email dan/atau WhatsApp pengguna sesuai preferensinya.
 * Dipanggil SETELAH transaksi database selesai. Kegagalan mengirim tidak pernah menggagalkan
 * tindakan utama (hanya dicatat di log). Isi pesan sengaja minim: nomor tiket + status, tanpa catatan petugas.
 */
export async function notifyExternal(req: Request, userId: number, subject: string, text: string): Promise<void> {
  try {
    const rows = await query<Row>(
      "SELECT name, email, phone, notify_email, notify_wa, email_verified_at FROM users WHERE id = ? AND is_active = 1 LIMIT 1",
      [userId]
    );
    const u = rows[0];
    if (!u) return;
    const link = `${appUrl(req)}/dashboard`;
    const jobs: Promise<unknown>[] = [];
    if (u.notify_email && u.email_verified_at) {
      jobs.push(sendMail(u.email, subject, `Halo ${u.name},\n${text}`, "Buka dashboard", link));
    }
    if (u.notify_wa && u.phone && whatsappEnabled()) {
      jobs.push(sendWhatsApp(u.phone, `SmartGov Connect\n${text}\n${link}`));
    }
    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[outbound] gagal:", err);
  }
}
