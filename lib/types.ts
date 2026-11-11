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
  totals: { reports: number; users: number };
  byStatus: { status: Status; n: number }[];
  byCategory: { name: string; n: number }[];
  byRole: { role: Role; n: number }[];
  daily: { date: string; n: number }[];
}
