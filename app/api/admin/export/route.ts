import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, run } from "@/lib/http";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  ticket_no: string;
  title: string;
  category_name: string;
  status: Status;
  location_text: string;
  latitude: string | null;
  longitude: string | null;
  assigned_name: string | null;
  officer_note: string | null;
  created_at: Date;
  updated_at: Date;
  due_at: Date;
  votes: number;
  stars: number | null;
}

function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  return run(async () => {
    await requireUser(["admin"]);
    const url = new URL(req.url);
    const where: string[] = [];
    const params: unknown[] = [];

    const status = url.searchParams.get("status") ?? "";
    if (status) {
      if (!(STATUSES as readonly string[]).includes(status)) throw new HttpError(400, "Status tidak valid.");
      where.push("r.status = ?");
      params.push(status);
    }
    const cat = Number(url.searchParams.get("category_id") ?? "");
    if (Number.isInteger(cat) && cat > 0) {
      where.push("r.category_id = ?");
      params.push(cat);
    }
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    if (from) {
      if (!DATE_RE.test(from)) throw new HttpError(400, "Format tanggal 'from' harus YYYY-MM-DD.");
      where.push("r.created_at >= ?");
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      if (!DATE_RE.test(to)) throw new HttpError(400, "Format tanggal 'to' harus YYYY-MM-DD.");
      where.push("r.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(`${to} 00:00:00`);
    }

    const rows = await query<Row>(
      `SELECT r.ticket_no, r.title, c.name AS category_name, r.status, r.location_text, r.latitude, r.longitude,
              a.name AS assigned_name, r.officer_note, r.created_at, r.updated_at,
              DATE_ADD(r.created_at, INTERVAL c.sla_hours HOUR) AS due_at,
              (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS votes,
              (SELECT stars FROM report_ratings rt WHERE rt.report_id = r.id) AS stars
         FROM reports r
         JOIN categories c ON c.id = r.category_id
         LEFT JOIN users a ON a.id = r.assigned_to
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY r.created_at DESC
        LIMIT 5000`,
      params
    );

    const header = ["Tiket", "Judul", "Kategori", "Status", "Lokasi", "Latitude", "Longitude", "Pelapor", "Petugas", "Catatan terakhir", "Dibuat (UTC)", "Diperbarui (UTC)", "Batas SLA (UTC)", "Terlambat", "Dukungan", "Bintang"];
    const lines = [header.map(cell).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.ticket_no,
          r.title,
          r.category_name,
          STATUS_LABEL[r.status],
          r.location_text,
          r.latitude,
          r.longitude,
          "Warga Anonim",
          r.assigned_name,
          r.officer_note,
          new Date(r.created_at).toISOString(),
          new Date(r.updated_at).toISOString(),
          new Date(r.due_at).toISOString(),
          (r.status === "baru" || r.status === "diverifikasi" || r.status === "diproses") && new Date(r.due_at).getTime() < Date.now() ? "Ya" : "Tidak",
          r.votes,
          r.stars,
        ]
          .map(cell)
          .join(",")
      );
    }

    const body = "\ufeff" + lines.join("\r\n") + "\r\n";
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-smartgov-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
