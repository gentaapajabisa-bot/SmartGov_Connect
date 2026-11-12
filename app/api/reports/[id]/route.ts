import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { HttpError, ok, parseId, readJson, run } from "@/lib/http";
import { notify, statusMessage } from "@/lib/notify";
import { REPORT_JOINS, REPORT_SELECT, toSummary, type ReportRow } from "@/lib/reports";
import { STATUS_LABEL, type HistoryItem, type ReportDetailData, type Status } from "@/lib/types";
import { reportUpdateSchema } from "@/lib/validation";

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
      `SELECT ${REPORT_SELECT}, r.description, r.latitude, r.longitude, r.officer_note, r.updated_at
         ${REPORT_JOINS}
        WHERE r.id = ? LIMIT 1`,
      [id]
    );
    const row = rows[0];
    // Warga yang bukan pemilik mendapat 404 (bukan 403) agar keberadaan laporan tidak bocor.
    if (!row || (user.role === "warga" && row.user_id !== user.id)) {
      throw new HttpError(404, "Laporan tidak ditemukan.");
    }

    const [historyRows, photoRows] = await Promise.all([
      query<HistoryRow>(
        `SELECT h.id, h.status, h.note, h.changed_by, u.name AS actor_name, h.created_at
           FROM report_status_history h
           JOIN users u ON u.id = h.changed_by
          WHERE h.report_id = ?
          ORDER BY h.created_at, h.id`,
        [id]
      ),
      query<RowDataPacket & { id: number }>("SELECT id FROM report_photos WHERE report_id = ? ORDER BY id", [id]),
    ]);

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
      photos: photoRows.map((p) => ({ id: p.id })),
    };
    return ok({ report: detail });
  });
}

// Petugas/admin: ubah status + catatan tindak lanjut, dan/atau tugaskan laporan.
export async function PATCH(req: Request, { params }: Ctx) {
  return run(async () => {
    const user = await requireUser(["petugas", "admin"]);
    const id = parseId(params.id);
    const data = reportUpdateSchema.parse(await readJson(req));
    const note = data.note?.trim() || null;

    await withTransaction(async (conn) => {
      const [found] = await conn.query<(RowDataPacket & { status: Status; ticket_no: string; user_id: number; assigned_to: number | null })[]>(
        "SELECT status, ticket_no, user_id, assigned_to FROM reports WHERE id = ? FOR UPDATE",
        [id]
      );
      const current = found[0];
      if (!current) throw new HttpError(404, "Laporan tidak ditemukan.");

      // Laporan yang sudah ditutup hanya boleh diubah kembali oleh admin.
      if ((current.status === "selesai" || current.status === "ditolak") && user.role !== "admin") {
        throw new HttpError(409, "Laporan sudah ditutup. Hanya admin yang dapat mengubahnya kembali.");
      }

      let status: Status = current.status;

      // --- Penugasan ---
      if (data.assigned_to !== undefined && data.assigned_to !== current.assigned_to) {
        const target = data.assigned_to;
        if (target === null) {
          // Melepas penugasan: admin bebas; petugas hanya melepas tugas miliknya sendiri.
          if (user.role !== "admin" && current.assigned_to !== user.id) {
            throw new HttpError(403, "Anda hanya dapat melepas penugasan milik Anda sendiri.");
          }
          await conn.query("UPDATE reports SET assigned_to = NULL WHERE id = ?", [id]);
          await conn.query(
            "INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, ?, ?, ?)",
            [id, status, "Penugasan dilepas.", user.id]
          );
        } else {
          if (user.role !== "admin" && target !== user.id) {
            throw new HttpError(403, "Petugas hanya dapat menugaskan laporan kepada dirinya sendiri.");
          }
          const [tgt] = await conn.query<(RowDataPacket & { name: string })[]>(
            "SELECT name FROM users WHERE id = ? AND is_active = 1 AND role IN ('petugas','admin')",
            [target]
          );
          if (!tgt[0]) throw new HttpError(400, "Petugas tujuan tidak ditemukan atau tidak aktif.");
          await conn.query("UPDATE reports SET assigned_to = ? WHERE id = ?", [target, id]);
          await conn.query(
            "INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, ?, ?, ?)",
            [id, status, `Ditugaskan kepada ${tgt[0].name}.`, user.id]
          );
          if (target !== user.id) {
            await notify(conn, target, id, `Anda ditugaskan menangani laporan ${current.ticket_no}.`);
          }
        }
      }

      // --- Status dan/atau catatan ---
      const statusChanged = data.status !== undefined && data.status !== current.status;
      if (statusChanged || note) {
        if (!statusChanged && !note) throw new HttpError(400, "Tidak ada perubahan.");
        status = data.status ?? current.status;
        await conn.query<ResultSetHeader>(
          "UPDATE reports SET status = ?, officer_note = COALESCE(?, officer_note), handled_by = ? WHERE id = ?",
          [status, note, user.id, id]
        );
        await conn.query(
          "INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, ?, ?, ?)",
          [id, status, note, user.id]
        );
        // Beri tahu pelapor (tanpa membuka identitas petugas).
        if (statusChanged) {
          await notify(conn, current.user_id, id, statusMessage(current.ticket_no, status));
        } else {
          await notify(conn, current.user_id, id, `Ada catatan baru pada laporan ${current.ticket_no} (status: ${STATUS_LABEL[status]}).`);
        }
      }
    });

    return ok({ success: true });
  });
}
