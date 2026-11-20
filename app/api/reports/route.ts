import { randomBytes, randomInt } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getCurrentUser } from "@/lib/auth";
import { isDuplicate, query, withTransaction } from "@/lib/db";
import { HttpError, ok, readJson, run } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { REPORT_JOINS, REPORT_SELECT, hashDeviceToken, toSummary, type ReportRow } from "@/lib/reports";
import { STATUSES, type Status } from "@/lib/types";
import { reportCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newTicketNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += TICKET_ALPHABET[randomInt(TICKET_ALPHABET.length)];
  return `SGC-${date}-${suffix}`;
}

// Daftar laporan:
// - Petugas/Admin melihat semua laporan dengan filter lengkap.
// - Warga tanpa login dapat mengambil daftar laporan miliknya lewat query ?tickets=SGC-...,SGC-...
//   atau melihat ringkasan publik terbaru (?public=1).
export async function GET(req: Request) {
  return run(async () => {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const categoryId = Number(url.searchParams.get("category_id") ?? "");
    const assigned = url.searchParams.get("assigned") ?? "";
    const onlyOverdue = url.searchParams.get("overdue") === "1";
    const sort = url.searchParams.get("sort") ?? "";
    const ticketsParam = url.searchParams.get("tickets") ?? "";
    const isPublicFeed = url.searchParams.get("public") === "1";

    const where: string[] = [];
    const params: unknown[] = [];

    if (!user) {
      if (ticketsParam) {
        const list = ticketsParam
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 50);
        if (list.length === 0) return ok({ reports: [] });
        where.push(`r.ticket_no IN (${list.map(() => "?").join(",")})`);
        params.push(...list);
      } else if (isPublicFeed) {
        // Feed publik hanya menampilkan laporan valid (bukan ditolak)
        where.push("r.status <> 'ditolak'");
      } else {
        return ok({ reports: [] });
      }
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
    if (user) {
      if (assigned === "me") {
        where.push("r.assigned_to = ?");
        params.push(user.id);
      } else if (assigned === "none") {
        where.push("r.assigned_to IS NULL");
      }
      if (onlyOverdue) {
        where.push("r.status IN ('baru','diverifikasi','diproses') AND DATE_ADD(r.created_at, INTERVAL c.sla_hours HOUR) < UTC_TIMESTAMP()");
      }
    }
    if (q) {
      const like = `%${q.replace(/[\%_]/g, "\\$&")}%`;
      where.push("(r.ticket_no LIKE ? OR r.title LIKE ?)");
      params.push(like, like);
    }

    const limit = !user && isPublicFeed ? 10 : 100;
    const rows = await query<ReportRow>(
      `SELECT ${REPORT_SELECT}
         ${REPORT_JOINS}
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY ${sort === "votes" ? "votes DESC, r.created_at DESC" : sort === "due" ? "due_at ASC" : "r.created_at DESC"}
        LIMIT ${limit}`,
      params
    );

    const viewerRole = user ? user.role : "warga";
    return ok({ reports: rows.map((r) => toSummary(viewerRole, r)) });
  });
}

// Membuat pengaduan baru secara anonim tanpa login.
// Mengembalikan id, ticket_no, dan device_token (disimpan di localStorage browser warga).
export async function POST(req: Request) {
  return run(async () => {
    await rateLimit(`report:ip:${clientIp(req)}`, 15, 60 * 60);
    const data = reportCreateSchema.parse(await readJson(req));

    const cat = await query<RowDataPacket>("SELECT id FROM categories WHERE id = ? AND is_active = 1", [
      data.category_id,
    ]);
    if (!cat[0]) throw new HttpError(400, "Kategori tidak ditemukan atau sudah tidak aktif.");

    const rawDeviceToken = randomBytes(24).toString("hex");
    const tokenHash = hashDeviceToken(rawDeviceToken);

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNo = newTicketNo();
      try {
        const reportId = await withTransaction(async (conn) => {
          const [res] = await conn.query<ResultSetHeader>(
            `INSERT INTO reports
               (ticket_no, device_token_hash, user_id, category_id, title, description, location_text, latitude, longitude, is_anonymous, status)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 1, 'baru')`,
            [
              ticketNo,
              tokenHash,
              data.category_id,
              data.title,
              data.description,
              data.location_text,
              data.latitude ?? null,
              data.longitude ?? null,
            ]
          );
          await conn.query(
            "INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, 'baru', ?, NULL)",
            [res.insertId, "Laporan anonim diterima sistem."]
          );
          return res.insertId;
        });
        return ok({ id: reportId, ticket_no: ticketNo, device_token: rawDeviceToken }, 201);
      } catch (err) {
        if (isDuplicate(err)) continue;
        throw err;
      }
    }
    throw new HttpError(500, "Gagal membuat nomor tiket. Silakan coba lagi.");
  });
}
