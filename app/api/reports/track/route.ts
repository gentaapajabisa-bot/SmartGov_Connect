import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { HttpError, ok, run } from "@/lib/http";
import { REPORT_JOINS, REPORT_SELECT, toSummary, type ReportRow } from "@/lib/reports";
import type { HistoryItem, RatingData, ReportDetailData, Status } from "@/lib/types";

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
  changed_by: number | null;
  created_at: Date;
}

// GET /api/reports/track?ticket=SGC-20261120-XXXXXX
export async function GET(req: Request) {
  return run(async () => {
    const url = new URL(req.url);
    const ticket = (url.searchParams.get("ticket") ?? "").trim().toUpperCase();
    if (!ticket) throw new HttpError(400, "Masukkan nomor tiket pelacakan.");

    const rows = await query<DetailRow>(
      `SELECT ${REPORT_SELECT}, r.description, r.latitude, r.longitude, r.officer_note, r.updated_at
         ${REPORT_JOINS}
        WHERE r.ticket_no = ? LIMIT 1`,
      [ticket]
    );
    const row = rows[0];
    if (!row) throw new HttpError(404, "Nomor tiket tidak ditemukan. Periksa kembali kode pelacakan Anda.");

    const [historyRows, photoRows, ratingRows] = await Promise.all([
      query<HistoryRow>(
        `SELECT id, status, note, changed_by, created_at
           FROM report_status_history
          WHERE report_id = ?
          ORDER BY created_at, id`,
        [row.id]
      ),
      query<RowDataPacket & { id: number; kind: "report" | "proof" }>(
        "SELECT id, kind FROM report_photos WHERE report_id = ? ORDER BY id",
        [row.id]
      ),
      query<RowDataPacket & { stars: number; comment: string | null }>(
        "SELECT stars, comment FROM report_ratings WHERE report_id = ? LIMIT 1",
        [row.id]
      ),
    ]);

    const rating: RatingData | null = ratingRows[0]
      ? { stars: Number(ratingRows[0].stars), comment: ratingRows[0].comment }
      : null;

    const history: HistoryItem[] = historyRows.map((h) => ({
      id: h.id,
      status: h.status,
      note: h.note,
      actor: h.changed_by === null ? "Sistem (Pelapor Anonim)" : "Petugas Kelurahan",
      created_at: new Date(h.created_at).toISOString(),
    }));

    const detail: ReportDetailData = {
      ...toSummary("warga", row),
      description: row.description,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      officer_note: row.officer_note,
      updated_at: new Date(row.updated_at).toISOString(),
      history,
      photos: photoRows.map((p) => ({ id: p.id, kind: p.kind })),
      rating,
    };

    return ok({ report: detail });
  });
}
