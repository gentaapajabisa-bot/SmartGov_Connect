import type { RowDataPacket } from "mysql2";
import type { ReportSummary, Role, SessionUser, Status } from "./types";

export interface ReportRow extends RowDataPacket {
  id: number;
  ticket_no: string;
  user_id: number;
  title: string;
  status: Status;
  location_text: string;
  is_anonymous: number;
  created_at: Date;
  category_name: string;
  reporter_name: string;
}

/**
 * Perlindungan data pribadi pada tampilan laporan:
 *  - Warga hanya melihat laporannya sendiri, jadi nama tidak perlu ditampilkan.
 *  - Petugas tidak melihat nama pelapor bila laporan ditandai anonim.
 *  - Admin melihat nama asli untuk keperluan audit dan moderasi.
 * Email dan nomor HP pelapor tidak pernah dikirim ke tampilan laporan.
 */
export function visibleReporterName(viewerRole: Role, row: { is_anonymous: number; reporter_name: string }): string | null {
  if (viewerRole === "warga") return null;
  if (viewerRole === "petugas" && row.is_anonymous) return null;
  return row.reporter_name;
}

export function toSummary(viewer: SessionUser, row: ReportRow): ReportSummary {
  return {
    id: row.id,
    ticket_no: row.ticket_no,
    title: row.title,
    status: row.status,
    category_name: row.category_name,
    location_text: row.location_text,
    reporter_name: visibleReporterName(viewer.role, row),
    is_anonymous: Boolean(row.is_anonymous),
    created_at: new Date(row.created_at).toISOString(),
  };
}
