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
  assigned_to: number | null;
  created_at: Date;
  category_name: string;
  reporter_name: string;
  assigned_name: string | null;
}

/** Kolom dan JOIN standar untuk daftar/detail laporan. Alias: r=reports, c=categories, u=pelapor, a=petugas. */
export const REPORT_SELECT = `r.id, r.ticket_no, r.user_id, r.title, r.status, r.location_text, r.is_anonymous,
  r.assigned_to, r.created_at, c.name AS category_name, u.name AS reporter_name, a.name AS assigned_name`;
export const REPORT_JOINS = `FROM reports r
  JOIN categories c ON c.id = r.category_id
  JOIN users u ON u.id = r.user_id
  LEFT JOIN users a ON a.id = r.assigned_to`;

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
  const staff = viewer.role !== "warga";
  return {
    id: row.id,
    ticket_no: row.ticket_no,
    title: row.title,
    status: row.status,
    category_name: row.category_name,
    location_text: row.location_text,
    reporter_name: visibleReporterName(viewer.role, row),
    is_anonymous: Boolean(row.is_anonymous),
    // Nama petugas tidak dibuka ke warga.
    assigned_to: staff ? row.assigned_to : null,
    assigned_name: staff ? row.assigned_name : null,
    created_at: new Date(row.created_at).toISOString(),
  };
}
