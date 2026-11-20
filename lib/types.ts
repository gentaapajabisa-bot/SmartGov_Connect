// Tipe dan konstanta yang dipakai bersama oleh server dan klien.

export const ROLES = ["petugas", "admin"] as const;
export type Role = (typeof ROLES)[number];
export type ViewerRole = "warga" | Role;

export const STATUSES = ["baru", "diverifikasi", "diproses", "selesai", "ditolak"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  baru: "Baru",
  diverifikasi: "Terverifikasi",
  diproses: "Sedang Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export const ROLE_LABEL: Record<Role, string> = {
  petugas: "Petugas Kelurahan",
  admin: "Admin",
};

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  email_verified: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  sla_hours: number;
  is_active: boolean;
}

export interface ReportSummary {
  id: number;
  ticket_no: string;
  title: string;
  status: Status;
  category_name: string;
  location_text: string;
  /** Selalu "Warga Anonim" karena laporan tidak menyimpan identitas pelapor. */
  reporter_name: string | null;
  is_anonymous: boolean;
  assigned_to: number | null;
  assigned_name: string | null;
  created_at: string;
  due_at: string;
  overdue: boolean;
  votes: number;
  rating_stars?: number | null;
  first_photo_id?: number | null;
}

export interface PhotoRef {
  id: number;
  kind: "report" | "proof";
}

export interface RatingData {
  stars: number;
  comment: string | null;
}

export interface NearbyReport {
  id: number;
  title: string;
  category_name: string;
  status: Status;
  distance_m: number;
  votes: number;
  voted: boolean;
}

export interface StaffUser {
  id: number;
  name: string;
  role: Role;
}

export interface MapPoint {
  id: number;
  ticket_no: string;
  title: string;
  status: Status;
  category_name: string;
  latitude: number;
  longitude: number;
}

export interface NotificationItem {
  id: number;
  report_id: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface HistoryItem {
  id: number;
  status: Status;
  note: string | null;
  actor: string;
  created_at: string;
}

export interface ReportDetailData extends ReportSummary {
  description: string;
  latitude: number | null;
  longitude: number | null;
  officer_note: string | null;
  updated_at: string;
  history: HistoryItem[];
  photos: PhotoRef[];
  rating: RatingData | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Stats {
  days: number;
  categoryId: number | null;
  avgResolveHours: number | null;
  unassigned: number;
  workload: { name: string; open: number; done: number; rating: number | null }[];
  overdue: number;
  slaMetPct: number | null;
  avgRating: number | null;
  ratingCount: number;
  totals: { reports: number; users: number };
  byStatus: { status: Status; n: number }[];
  byCategory: { name: string; n: number }[];
  byRole: { role: Role; n: number }[];
  daily: { date: string; n: number }[];
}
