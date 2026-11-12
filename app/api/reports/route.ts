import { randomInt } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { isDuplicate, query, withTransaction } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { REPORT_JOINS, REPORT_SELECT, toSummary, type ReportRow } from "@/lib/reports";
import { STATUSES, type Status } from "@/lib/types";
import { reportCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa karakter yang mudah tertukar

function newTicketNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += TICKET_ALPHABET[randomInt(TICKET_ALPHABET.length)];
  return `SGC-${date}-${suffix}`;
}

// Daftar laporan. Warga hanya melihat miliknya; petugas dan admin melihat semuanya.
// Filter: status, q (tiket/judul), category_id, assigned (me | none) khusus staf.
export async function GET(req: Request) {
  return run(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const categoryId = Number(url.searchParams.get("category_id") ?? "");
    const assigned = url.searchParams.get("assigned") ?? "";

    const where: string[] = [];
    const params: unknown[] = [];

    if (user.role === "warga") {
      where.push("r.user_id = ?");
      params.push(user.id);
    }
    if (status) {
      if (!(STATUSES as readonly string[]).includes(status)) throw new HttpError(400, "Status tidak valid.");
      where.push("r.status = ?");
      params.push(status as Status);
    }
    if (Number.isInteger(categoryId) && categoryId > 0) {
      where.push("r.category_id = ?");
      params.push(categoryId);
    }
    if (user.role !== "warga") {
      if (assigned === "me") {
        where.push("r.assigned_to = ?");
        params.push(user.id);
      } else if (assigned === "none") {
        where.push("r.assigned_to IS NULL");
      }
    }
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      where.push("(r.ticket_no LIKE ? OR r.title LIKE ?)");
      params.push(like, like);
    }

    const rows = await query<ReportRow>(
      `SELECT ${REPORT_SELECT}
         ${REPORT_JOINS}
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY r.created_at DESC
        LIMIT 100`,
      params
    );

    return ok({ reports: rows.map((r) => toSummary(user, r)) });
  });
}

// Membuat pengaduan baru (hanya warga).
export async function POST(req: Request) {
  return run(async () => {
    const user = await requireUser(["warga"]);
    const data = reportCreateSchema.parse(await readJson(req));

    const cat = await query<RowDataPacket>("SELECT id FROM categories WHERE id = ? AND is_active = 1", [
      data.category_id,
    ]);
    if (!cat[0]) throw new HttpError(400, "Kategori tidak ditemukan atau sudah tidak aktif.");

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNo = newTicketNo();
      try {
        const reportId = await withTransaction(async (conn) => {
          const [res] = await conn.query<ResultSetHeader>(
            `INSERT INTO reports
               (ticket_no, user_id, category_id, title, description, location_text, latitude, longitude, is_anonymous, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'baru')`,
            [
              ticketNo,
              user.id,
              data.category_id,
              data.title,
              data.description,
              data.location_text,
              data.latitude ?? null,
              data.longitude ?? null,
              data.is_anonymous ? 1 : 0,
            ]
          );
          await conn.query(
            "INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, 'baru', ?, ?)",
            [res.insertId, "Laporan diterima sistem.", user.id]
          );
          return res.insertId;
        });
        return ok({ id: reportId, ticket_no: ticketNo }, 201);
      } catch (err) {
        if (isDuplicate(err)) continue; // nomor tiket bentrok, coba lagi
        throw err;
      }
    }
    throw new HttpError(500, "Gagal membuat nomor tiket. Silakan coba lagi.");
  });
}
