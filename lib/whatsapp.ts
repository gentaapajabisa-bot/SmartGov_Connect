// Pengiriman WhatsApp lewat penyedia pihak ketiga (contoh: Fonnte, https://fonnte.com).
// Tanpa WHATSAPP_TOKEN, fitur ini nonaktif. Catatan: kode ini belum diuji terhadap akun penyedia sungguhan;
// sesuaikan endpoint dan parameter bila Anda memakai penyedia lain.

export function whatsappEnabled(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN);
}

/** Mengubah 08xx / +628xx / 628xx menjadi 628xx. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (/^08\d{7,12}$/.test(d)) return "62" + d.slice(1);
  if (/^628\d{7,12}$/.test(d)) return d;
  return null;
}

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const target = normalizePhone(phone);
  if (!token || !target) return false;
  try {
    const res = await fetch(process.env.WHATSAPP_API_URL || "https://api.fonnte.com/send", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: { Authorization: token },
      body: new URLSearchParams({ target, message }),
    });
    if (!res.ok) {
      console.error("[wa] penyedia menolak:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[wa] gagal mengirim:", err);
    return false;
  }
}
