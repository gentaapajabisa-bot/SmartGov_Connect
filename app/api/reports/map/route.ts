import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, run } from "@/lib/http";
import type { MapPoint, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  id: number;
  ticket_no: string;
  title: string;
  status: Status;
  category_name: string;
  latitude: string;
  longitude: string;
}

// Titik laporan untuk peta sebaran. Hanya staf; tidak memuat identitas pelapor sama sekali.
export async function GET(req: Request) {
  return run(async () => {
    await requireUser(["petugas", "admin"]);
    const onlyOpen = new URL(req.url).searchParams.get("open") === "1";
    const rows = await query<Row>(
      `SELECT r.id, r.ticket_no, r.title, r.status, c.name AS category_name, r.latitude, r.longitude
         FROM reports r JOIN categories c ON c.id = r.category_id
        WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
          ${onlyOpen ? "AND r.status IN ('baru','diverifikasi','diproses')" : ""}
        ORDER BY r.created_at DESC
        LIMIT 500`
    );
    const points: MapPoint[] = rows.map((r) => ({
      id: r.id,
      ticket_no: r.ticket_no,
      title: r.title,
      status: r.status,
      category_name: r.category_name,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
    }));
    return ok({ points });
  });
}
