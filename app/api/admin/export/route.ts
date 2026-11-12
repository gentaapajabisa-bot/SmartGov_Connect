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
  reporter_name: string;
  is_anonymous: number;
  assigned_name: string | null;
  officer_note: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Escape CSV + cegah injeksi rumus spreadsheet (sel yang diawali = + - @ dianggap rumus oleh Excel). */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Ekspor laporan ke CSV (khusus admin). Filter: status, category_id, from, to (YYYY-MM-DD).
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
              u.name AS reporter_name, r.is_anonymous, a.name AS assigned_name, r.officer_note, r.created_at, r.updated_at
         FROM reports r
         JOIN categories c ON c.id = r.category_id
         JOIN users u ON u.id = r.user_id
         LEFT JOIN users a ON a.id = r.assigned_to
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY r.created_at DESC
        LIMIT 5000`,
      params
    );

    const header = ["Tiket", "Judul", "Kategori", "Status", "Lokasi", "Latitude", "Longitude", "Pelapor", "Anonim ke petugas", "Petugas", "Catatan terakhir", "Dibuat (UTC)", "Diperbarui (UTC)"];
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
          r.reporter_name,
          r.is_anonymous ? "Ya" : "Tidak",
          r.assigned_name,
          r.officer_note,
          new Date(r.created_at).toISOString(),
          new Date(r.updated_at).toISOString(),
        ]
          .map(cell)
          .join(",")
      );
    }

    // BOM agar Excel membaca UTF-8 dengan benar.
    const body = "﻿" + lines.join("\r\n") + "\r\n";
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
