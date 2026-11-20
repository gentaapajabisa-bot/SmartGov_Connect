import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticket: string } }
) {
  try {
    const db = pool();
    const ticketCode = params.ticket?.trim().toUpperCase();
    if (!ticketCode || !/^SGC-\d{8}-[A-Z0-9]{6}$/.test(ticketCode)) {
      return NextResponse.json({ error: "Format nomor tiket tidak valid" }, { status: 400 });
    }

    const [rows]: any = await db.query(
      `SELECT 
        r.id, r.ticket_code, r.title, r.description, r.address, r.kecamatan, r.desa,
        r.status, r.created_at, r.updated_at,
        c.name AS category_name,
        a.name AS agency_name, a.short_name AS agency_short_name
      FROM reports r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN agencies a ON r.agency_id = a.id
      WHERE r.ticket_code = ?
      LIMIT 1`,
      [ticketCode]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nomor tiket tidak ditemukan" }, { status: 404 });
    }

    const report = rows[0];

    const [history] = await db.query(
      `SELECT status, note, created_at 
       FROM report_status_history 
       WHERE report_id = ? 
       ORDER BY created_at ASC`,
      [report.id]
    );

    return NextResponse.json({
      report: {
        ticket_code: report.ticket_code,
        title: report.title,
        description: report.description,
        location: `${report.address}, Desa/Kel. ${report.desa}, Kec. ${report.kecamatan}, Kab. Purbalingga`,
        status: report.status,
        category_name: report.category_name,
        agency_name: report.agency_name,
        created_at: report.created_at,
        updated_at: report.updated_at,
      },
      history,
    });
  } catch (err) {
    console.error("GET /api/reports/track error:", err);
    return NextResponse.json({ error: "Gagal melacak tiket" }, { status: 500 });
  }
}
