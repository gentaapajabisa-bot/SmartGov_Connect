import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const db = pool();
    const [rows]: any = await db.query(
      "SELECT id, code, name, short_name FROM agencies WHERE is_active = 1 ORDER BY id ASC"
    );
    return NextResponse.json({ agencies: rows });
  } catch {
    return NextResponse.json({ agencies: [] });
  }
}
