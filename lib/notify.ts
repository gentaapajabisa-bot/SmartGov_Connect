import type { PoolConnection } from "mysql2/promise";
import { STATUS_LABEL, type Status } from "./types";

/** Menyimpan notifikasi di dalam transaksi yang sama dengan perubahan datanya. */
export async function notify(conn: PoolConnection, userId: number, reportId: number | null, message: string) {
  await conn.query("INSERT INTO notifications (user_id, report_id, message) VALUES (?, ?, ?)", [
    userId,
    reportId,
    message.slice(0, 255),
  ]);
}

export function statusMessage(ticketNo: string, status: Status): string {
  return `Laporan ${ticketNo} kini berstatus: ${STATUS_LABEL[status]}.`;
}
