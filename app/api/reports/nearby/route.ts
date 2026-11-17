import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, ok, run } from "@/lib/http";
import type { NearbyReport, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const RADIUS_M = 250;

interface Row extends RowDataPacket {
  id: number;
  title: string;
  category_name: string;
  status: Status;
  dist: number;
  votes: number;
  voted: number;
}

// Laporan serupa yang masih berjalan di sekitar suatu titik, untuk mencegah laporan ganda.
// Yang dikembalikan hanya judul, kategori, status, jarak, dan jumlah dukungan: tanpa identitas pelapor,
// tanpa alamat, dan tanpa laporan milik pemohon sendiri.
export async function GET(req: Request) {
  return run(async () => {
    const user = await requireUser(["warga"]);
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new HttpError(400, "Koordinat tidak valid.");
    }
    const cat = Number(url.searchParams.get("category_id") ?? "");

    const dLat = 0.003; // sekitar 330 m, melebihi radius agar tidak ada yang terlewat
    const dLng = dLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
    const params: unknown[] = [lat, lat, lng, user.id, user.id, lat - dLat, lat + dLat, lng - dLng, lng + dLng];
    let catSql = "";
    if (Number.isInteger(cat) && cat > 0) {
      catSql = " AND r.category_id = ?";
      params.push(cat);
    }
    params.push(RADIUS_M);

    const rows = await query<Row>(
      `SELECT r.id, r.title, c.name AS category_name, r.status,
              6371000 * 2 * ASIN(SQRT(
                POW(SIN(RADIANS(r.latitude - ?) / 2), 2) +
                COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * POW(SIN(RADIANS(r.longitude - ?) / 2), 2)
              )) AS dist,
              (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS votes,
              (SELECT COUNT(*) FROM report_votes v2 WHERE v2.report_id = r.id AND v2.user_id = ?) AS voted
         FROM reports r JOIN categories c ON c.id = r.category_id
        WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
          AND r.status IN ('baru','diverifikasi','diproses')
          AND r.user_id <> ?
          AND r.latitude BETWEEN ? AND ? AND r.longitude BETWEEN ? AND ?
          AND r.created_at >= (UTC_TIMESTAMP() - INTERVAL 90 DAY)${catSql}
       HAVING dist <= ?
        ORDER BY dist
        LIMIT 5`,
      params
    );

    const items: NearbyReport[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category_name: r.category_name,
      status: r.status,
      distance_m: Math.max(10, Math.round(Number(r.dist) / 10) * 10),
      votes: Number(r.votes),
      voted: Number(r.voted) > 0,
    }));
    return ok({ items });
  });
}
