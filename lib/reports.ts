import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import type { ReportSummary, Status, ViewerRole } from "./types";

export interface ReportRow extends RowDataPacket {
  id: number;
  ticket_no: string;
  title: string;
  status: Status;
  location_text: string;
  is_anonymous: number;
  assigned_to: number | null;
  created_at: Date;
  due_at: Date;
  votes: number;
  rating_stars: number | null;
  first_photo_id: number | null;
  category_name: string;
  assigned_name: string | null;
}

export const REPORT_SELECT = `r.id, r.ticket_no, r.title, r.status, r.location_text, r.is_anonymous,
  r.assigned_to, r.created_at, c.name AS category_name, a.name AS assigned_name,
  DATE_ADD(r.created_at, INTERVAL c.sla_hours HOUR) AS due_at,
  (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS votes,
  (SELECT rt.stars FROM report_ratings rt WHERE rt.report_id = r.id LIMIT 1) AS rating_stars,
  (SELECT p.id FROM report_photos p WHERE p.report_id = r.id AND p.kind = 'report' ORDER BY p.id ASC LIMIT 1) AS first_photo_id`;

export const REPORT_JOINS = `FROM reports r
  JOIN categories c ON c.id = r.category_id
  LEFT JOIN users a ON a.id = r.assigned_to`;

const OPEN: readonly Status[] = ["baru", "diverifikasi", "diproses"];

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function toSummary(viewerRole: ViewerRole, row: ReportRow): ReportSummary {
  const staff = viewerRole !== "warga";
  const due = new Date(row.due_at);
  return {
    id: row.id,
    ticket_no: row.ticket_no,
    title: row.title,
    status: row.status,
    category_name: row.category_name,
    location_text: row.location_text,
    reporter_name: staff ? "Warga Anonim" : null,
    is_anonymous: true,
    assigned_to: staff ? row.assigned_to : null,
    assigned_name: staff ? row.assigned_name : null,
    created_at: new Date(row.created_at).toISOString(),
    due_at: due.toISOString(),
    overdue: OPEN.includes(row.status) && due.getTime() < Date.now(),
    votes: Number(row.votes),
    rating_stars: row.rating_stars == null ? null : Number(row.rating_stars),
    first_photo_id: row.first_photo_id == null ? null : Number(row.first_photo_id),
  };
}
