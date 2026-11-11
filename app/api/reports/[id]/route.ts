import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { toSummary, type ReportRow } from "@/lib/reports";
import type { HistoryItem, ReportDetailData, Status } from "@/lib/types";
import { statusUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface DetailRow extends ReportRow {
  description: string;
  latitude: string | null;
  longitude: string | null;
  officer_note: string | null;
  updated_at: Date;
}

interface HistoryRow extends RowDataPacket {
  id: number;
  status: Status;
  note: string | null;
  changed_by: number;
  actor_name: string;
  created_at: Date;
}

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return run(async () => {
    const user = await requireUser();
    const id = parseId(params.id);

    const rows = await query<DetailRow>(
      `SELECT r.id, r.ticket_no, r.user_id, r.title, r.description, r.status, r.location_text,
              r.latitude, r.longitude, r.is_anonymous, r.officer_note, r.created_at, r.updated_at,
              c.name AS category_name, u.name AS reporter_name
         FROM reports r
         JOIN categories c ON c.id = r.category_id
         JOIN users u ON u.id = r.user_id
        WHERE r.id = ? LIMIT 1`,
      [id]
    );
    const row = rows[0];
    // Warga yang bukan pemilik mendapat 404 (bukan 403) agar keberadaan laporan tidak bocor.
    if (!row || (user.role === "warga" && row.user_id !== user.id)) {
      throw new HttpError(404, "Laporan tidak ditemukan.");
    }

    const historyRows = await query<HistoryRow>(
      `SELECT h.id, h.status, h.note, h.changed_by, u.name AS actor_name, h.created_at
         FROM report_status_history h
         JOIN users u ON u.id = h.changed_by
        WHERE h.report_id = ?
        ORDER BY h.created_at, h.id`,
      [id]
    );

    const history: HistoryItem[] = historyRows.map((h) => ({
      id: h.id,
      status: h.status,
      note: h.note,
      // Warga melihat label umum; nama petugas hanya ditampilkan kepada staf.
      actor:
        user.role === "warga"
          ? h.changed_by === user.id
            ? "Anda"
            : "Petugas Kelurahan"
          : h.actor_name,
      created_at: new Date(h.created_at).toISOString(),
    }));

    const detail: ReportDetailData = {
      ...toSummary(user, row),
      description: row.description,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      officer_note: row.officer_note,
      updated_at: new Date(row.updated_at).toISOString(),
      history,
    };
    return ok({ report: detail });
  });
}

// Petugas/admin memperbarui status dan catatan tindak lanjut.
export async function PATCH(req: Request, { params }: Ctx) {
  return run(async () => {
    const user = await requireUser(["petugas", "admin"]);
    const id = parseId(params.id);
    const data = statusUpdateSchema.parse(await readJson(req));
    const note = data.note?.trim() || null;

    await withTransaction(async (conn) => {
      const [found] = await conn.query<(RowDataPacket & { status: Status })[]>(
        "SELECT status FROM reports WHERE id = ? FOR UPDATE",
        [id]
      );
      const current = found[0];
      if (!current) throw new HttpError(404, "Laporan tidak ditemukan.");

      // Laporan yang sudah ditutup hanya boleh dibuka kembali oleh admin.
      if ((current.status === "selesai" || current.status === "ditolak") && user.role !== "admin") {
        throw new HttpError(409, "Laporan sudah ditutup. Hanya admin yang dapat mengubahnya kembali.");
      }
      if (current.status === data.status && !note) {
        throw new HttpError(400, "Tidak ada perubahan. Ubah status atau tambahkan catatan.");
      }

      await conn.query<ResultSetHeader>(
        "UPDATE reports SET status = ?, officer_note = COALESCE(?, officer_note), handled_by = ? WHERE id = ?",
        [data.status, note, user.id, id]
      );
      await conn.query(
        "INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, ?, ?, ?)",
        [id, data.status, note, user.id]
      );
    });

    return ok({ success: true });
  });
}
