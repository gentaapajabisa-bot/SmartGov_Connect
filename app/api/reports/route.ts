import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { pool } from "@/lib/db";
import * as authLib from "@/lib/auth";
import { KECAMATAN_PURBALINGGA } from "@/lib/purbalingga";

const createReportSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  title: z.string().min(5, "Judul laporan minimal 5 karakter").max(150),
  description: z.string().min(10, "Uraian kejadian minimal 10 karakter").max(2000),
  kecamatan: z.enum(KECAMATAN_PURBALINGGA),
  desa: z.string().min(2, "Nama desa/kelurahan wajib diisi").max(100),
  address: z.string().min(5, "Patokan lokasi minimal 5 karakter").max(255),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
});

function generateTicketCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SGC-${date}-${rand}`;
}

async function resolveAuthenticatedUser(req: NextRequest) {
  const lib = authLib as Record<string, any>;
  if (typeof lib.getCurrentUser === "function") return await lib.getCurrentUser(req);
  if (typeof lib.getAuthUser === "function") return await lib.getAuthUser(req);
  if (typeof lib.getSession === "function") return await lib.getSession(req);
  if (typeof lib.verifySession === "function") return await lib.verifySession(req);
  if (typeof lib.requireUser === "function") return await lib.requireUser(req);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const db = pool();

    // 1. Anti-spam berbasis hash harian (IP asli tidak pernah disimpan)
    const forwarded = req.headers.get("x-forwarded-for") || "unknown";
    const ip = forwarded.split(",")[0].trim();
    const dailySalt = new Date().toISOString().slice(0, 10);
    const keyHash = crypto
      .createHash("sha256")
      .update(`${ip}:${dailySalt}:create_report`)
      .digest("hex");

    const [rateRows]: any = await db.query(
      "SELECT hits, reset_at FROM rate_limits WHERE key_hash = ?",
      [keyHash]
    );

    if (rateRows.length > 0 && new Date(rateRows[0].reset_at) > new Date()) {
      if (rateRows[0].hits >= 5) {
        return NextResponse.json(
          { error: "Terlalu banyak pengiriman laporan. Silakan coba lagi nanti." },
          { status: 429 }
        );
      }
      await db.query("UPDATE rate_limits SET hits = hits + 1 WHERE key_hash = ?", [keyHash]);
    } else {
      await db.query(
        "REPLACE INTO rate_limits (key_hash, action, hits, reset_at) VALUES (?, 'create_report', 1, DATE_ADD(NOW(), INTERVAL 1 HOUR))",
        [keyHash]
      );
    }

    // 2. Baca FormData
    const formData = await req.formData();
    const parsed = createReportSchema.safeParse({
      category_id: formData.get("category_id"),
      title: formData.get("title"),
      description: formData.get("description"),
      kecamatan: formData.get("kecamatan"),
      desa: formData.get("desa"),
      address: formData.get("address"),
      latitude: formData.get("latitude") || null,
      longitude: formData.get("longitude") || null,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data laporan tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 3. Ambil agency_id (OPD penanggung jawab) dari kategori
    const [catRows]: any = await db.query(
      "SELECT agency_id FROM categories WHERE id = ? LIMIT 1",
      [data.category_id]
    );

    if (catRows.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const agencyId = catRows[0].agency_id;
    const ticketCode = generateTicketCode();

    // 4. Simpan laporan anonim (user_id = NULL, is_anonymous = 1)
    const [insertResult]: any = await db.query(
      `INSERT INTO reports 
        (ticket_code, user_id, category_id, agency_id, title, description, address, kecamatan, desa, latitude, longitude, status, is_anonymous)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
      [
        ticketCode,
        data.category_id,
        agencyId,
        data.title,
        data.description,
        data.address,
        data.kecamatan,
        data.desa,
        data.latitude ?? null,
        data.longitude ?? null,
      ]
    );

    const reportId = insertResult.insertId;

    // 5. Simpan foto bukti (maksimal 3 foto, maks 5MB per foto)
    const photos = formData.getAll("photos") as File[];
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    for (const photo of photos.slice(0, 3)) {
      if (photo && photo.size > 0) {
        if (!allowedTypes.includes(photo.type) || photo.size > 5 * 1024 * 1024) {
          continue;
        }
        const buffer = Buffer.from(await photo.arrayBuffer());
        await db.query(
          "INSERT INTO report_photos (report_id, mime_type, data, kind) VALUES (?, ?, ?, 'evidence')",
          [reportId, photo.type, buffer]
        );
      }
    }

    // 6. Catat riwayat status awal
    await db.query(
      "INSERT INTO report_status_history (report_id, status, note) VALUES (?, 'pending', 'Laporan diterima sistem secara anonim dan diteruskan ke dinas terkait.')",
      [reportId]
    );

    return NextResponse.json(
      {
        message: "Laporan berhasil dikirim secara anonim",
        ticket_code: ticketCode,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = pool();
    const sessionUser = await resolveAuthenticatedUser(req);

    if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "officer")) {
      return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });
    }

    // Ambil agency_id terbaru langsung dari database users
    const [userRows]: any = await db.query(
      "SELECT role, agency_id FROM users WHERE id = ? LIMIT 1",
      [sessionUser.id]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 401 });
    }

    const dbUser = userRows[0];
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const kecamatan = searchParams.get("kecamatan");

    let sql = `
      SELECT 
        r.id, r.ticket_code, r.title, r.description, r.address, r.kecamatan, r.desa,
        r.latitude, r.longitude, r.status, r.is_anonymous, r.created_at, r.updated_at,
        c.name AS category_name, c.sla_hours,
        a.short_name AS agency_name, a.code AS agency_code
      FROM reports r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN agencies a ON r.agency_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (dbUser.role === "officer") {
      if (!dbUser.agency_id) {
        return NextResponse.json({ reports: [] });
      }
      sql += " AND r.agency_id = ?";
      params.push(dbUser.agency_id);
    }

    if (status) {
      sql += " AND r.status = ?";
      params.push(status);
    }

    if (kecamatan) {
      sql += " AND r.kecamatan = ?";
      params.push(kecamatan);
    }

    sql += " ORDER BY r.created_at DESC LIMIT 200";

    const [rows] = await db.query(sql, params);
    return NextResponse.json({ reports: rows });
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar laporan" }, { status: 500 });
  }
}
