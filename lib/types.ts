// Tipe dan konstanta yang dipakai bersama oleh server dan klien.

export const ROLES = ["warga", "petugas", "admin"] as const;
export type Role = (typeof ROLES)[number];

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
  warga: "Warga",
  petugas: "Petugas Kelurahan",
  admin: "Admin",
};

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ReportSummary {
  id: number;
  ticket_no: string;
  title: string;
  status: Status;
  category_name: string;
  location_text: string;
  /** null bila pelapor anonim (bagi petugas) atau bila pelihat adalah pelapor sendiri */
  reporter_name: string | null;
  is_anonymous: boolean;
  /** Hanya diisi untuk petugas/admin; warga selalu null. */
  assigned_to: number | null;
  assigned_name: string | null;
  created_at: string;
}

export interface PhotoRef {
  id: number;
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
  /** Rata-rata jam dari laporan masuk sampai pertama kali berstatus selesai; null bila belum ada. */
  avgResolveHours: number | null;
  unassigned: number;
  workload: { name: string; open: number; done: number }[];
  totals: { reports: number; users: number };
  byStatus: { status: Status; n: number }[];
  byCategory: { name: string; n: number }[];
  byRole: { role: Role; n: number }[];
  daily: { date: string; n: number }[];
}
