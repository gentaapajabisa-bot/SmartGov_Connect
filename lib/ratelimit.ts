import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db";
import { HttpError } from "./http";

/** Alamat IP klien dari header proxy Vercel. Hanya dipakai sebagai kunci pembatasan, bukan untuk identitas. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

interface Row extends RowDataPacket {
  hits: number;
  wait: number;
}

/**
 * Pembatasan sederhana berbasis database (cocok untuk serverless: tidak butuh Redis).
 * Setiap pemanggilan menghitung satu percobaan; bila melewati `max` dalam `windowSec` detik,
 * dilempar galat 429. Dengan beberapa kunci (mis. IP dan email) kedua batas berlaku.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<void> {
  const k = hashKey(key);
  await pool().query(
    `INSERT INTO rate_limits (k, hits, reset_at) VALUES (?, 1, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))
     ON DUPLICATE KEY UPDATE
       hits = IF(reset_at < UTC_TIMESTAMP(), 1, hits + 1),
       reset_at = IF(reset_at < UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), reset_at)`,
    [k, windowSec, windowSec]
  );
  const rows = await query<Row>(
    "SELECT hits, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), reset_at), 0) AS wait FROM rate_limits WHERE k = ?",
    [k]
  );
  const row = rows[0];
  if (row && row.hits > max) {
    const minutes = Math.max(1, Math.ceil(Number(row.wait) / 60));
    throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi sekitar ${minutes} menit lagi.`);
  }
}

/** Menghapus penghitung (mis. setelah login berhasil). */
export async function rateReset(key: string): Promise<void> {
  await pool().query("DELETE FROM rate_limits WHERE k = ?", [hashKey(key)]);
}
