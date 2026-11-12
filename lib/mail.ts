// Pengiriman email lewat Resend (https://resend.com). Tanpa RESEND_API_KEY, email tidak dikirim
// dan hanya dicatat di log server, sehingga aplikasi tetap berjalan saat pengembangan.

export function appUrl(req: Request): string {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  return fixed || new URL(req.url).origin;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendMail(to: string, subject: string, text: string, linkLabel?: string, link?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[mail] RESEND_API_KEY belum diisi; email "${subject}" ke ${to} tidak dikirim.`);
    return false;
  }
  const html =
    `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;line-height:1.55;color:#0b1730">` +
    `<h2 style="margin:0 0 12px">SmartGov Connect</h2><p>${esc(text).replace(/\n/g, "<br>")}</p>` +
    (link ? `<p><a href="${esc(link)}" style="display:inline-block;padding:10px 18px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none">${esc(linkLabel ?? "Buka tautan")}</a></p>` +
      `<p style="font-size:12px;color:#5b6b85">Jika tombol tidak berfungsi, salin tautan ini ke peramban:<br>${esc(link)}</p>` : "") +
    `</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "SmartGov Connect <onboarding@resend.dev>",
        to: [to],
        subject,
        text: link ? `${text}\n\n${link}` : text,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[mail] Resend menolak:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] gagal mengirim:", err);
    return false;
  }
}

export async function sendVerificationEmail(req: Request, to: string, name: string, token: string) {
  const link = `${appUrl(req)}/verify-email?token=${encodeURIComponent(token)}`;
  return sendMail(to, "Verifikasi email SmartGov Connect", `Halo ${name},\nKonfirmasi alamat email Anda agar kami dapat mengirim pembaruan laporan. Tautan berlaku 24 jam.`, "Verifikasi email", link);
}

export async function sendResetEmail(req: Request, to: string, name: string, token: string) {
  const link = `${appUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail(to, "Atur ulang kata sandi SmartGov Connect", `Halo ${name},\nKami menerima permintaan mengatur ulang kata sandi. Tautan berlaku 60 menit dan hanya bisa dipakai sekali. Abaikan email ini bila Anda tidak memintanya.`, "Atur ulang kata sandi", link);
}
