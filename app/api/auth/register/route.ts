import { HttpError, run } from "@/lib/http";

export async function POST() {
  return run(async () => {
    throw new HttpError(403, "Pendaftaran akun warga telah dinonaktifkan. Warga dapat langsung mengirim pengaduan secara anonim tanpa login.");
  });
}
