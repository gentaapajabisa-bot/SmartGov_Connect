import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { DEFAULT_EMERGENCY_CONTACTS } from "@/lib/purbalingga";

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, agency_name, category, phone_number, whatsapp_number, address, is_24_hours
       FROM emergency_contacts
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );

    if (rows.length > 0) {
      return NextResponse.json({ contacts: rows });
    }
    return NextResponse.json({ contacts: DEFAULT_EMERGENCY_CONTACTS });
  } catch {
    return NextResponse.json({ contacts: DEFAULT_EMERGENCY_CONTACTS });
  }
}
