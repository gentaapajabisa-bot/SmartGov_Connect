import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { pool, query } from "@/lib/db";
import { HttpError, ok, parseId, run } from "@/lib/http";

const MAX_BYTES = 800 * 1024; // klien mengompres ke JPEG <= ~600 KB; batas server lebih longgar
const MAX_PHOTOS = 3;

// Warga pemilik laporan mengunggah foto laporan; petugas yang ditugaskan (atau admin) mengunggah
// foto bukti penyelesaian. Isi permintaan berupa JPEG mentah.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return run(async () => {
    const user = await requireUser();
    const reportId = parseId(params.id);
    const staff = user.role !== "warga";
    const kind = staff ? "proof" : "report";

    const found = await query<RowDataPacket & { user_id: number; status: string; assigned_to: number | null }>(
      "SELECT user_id, status, assigned_to FROM reports WHERE id = ? LIMIT 1",
      [reportId]
    );
    const rep = found[0];
    if (!rep || (!staff && rep.user_id !== user.id)) throw new HttpError(404, "Laporan tidak ditemukan.");
    if (staff) {
      if (user.role === "petugas" && rep.assigned_to !== user.id) {
        throw new HttpError(403, "Hanya petugas yang ditugaskan (atau admin) yang dapat mengunggah bukti penyelesaian.");
      }
      if (rep.status !== "diproses" && rep.status !== "selesai") {
        throw new HttpError(409, "Bukti penyelesaian hanya dapat diunggah saat laporan diproses atau selesai.");
      }
    }

    const count = await query<RowDataPacket & { n: number }>(
      "SELECT COUNT(*) AS n FROM report_photos WHERE report_id = ? AND kind = ?",
      [reportId, kind]
    );
    if (Number(count[0].n) >= MAX_PHOTOS) throw new HttpError(409, `Maksimal ${MAX_PHOTOS} foto per laporan.`);

    if ((req.headers.get("content-type") ?? "").split(";")[0].trim() !== "image/jpeg") {
      throw new HttpError(415, "Format foto harus JPEG.");
    }
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0) throw new HttpError(400, "Berkas foto kosong.");
    if (buf.length > MAX_BYTES) throw new HttpError(413, "Ukuran foto terlalu besar (maksimal 800 KB setelah dikompres).");
    // Periksa tanda tangan berkas (bukan hanya header Content-Type yang bisa dipalsukan).
    if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) throw new HttpError(400, "Berkas bukan gambar JPEG yang valid.");

    const [res] = await pool().query<ResultSetHeader>(
      "INSERT INTO report_photos (report_id, kind, mime, size_bytes, data) VALUES (?, ?, 'image/jpeg', ?, ?)",
      [reportId, kind, buf.length, buf]
    );
    return ok({ id: res.insertId }, 201);
  });
}
