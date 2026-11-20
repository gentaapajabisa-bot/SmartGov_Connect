import { z } from "zod";
import { ROLES, STATUSES } from "./types";

const email = z.string().trim().toLowerCase().email("Email tidak valid.").max(150, "Email terlalu panjang.");

const password = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.")
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
  .regex(/[0-9]/, "Kata sandi harus memuat angka.");

const name = z.string().trim().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter.");

export const forgotSchema = z.object({ email });
export const tokenSchema = z.object({ token: z.string().min(10, "Tautan tidak valid.").max(100, "Tautan tidak valid.") });
export const resetSchema = z.object({
  token: z.string().min(10, "Tautan tidak valid.").max(100, "Tautan tidak valid."),
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Kata sandi wajib diisi.").max(72),
});

// Form pengaduan warga: murni anonim, tanpa nama, email, atau nomor kontak.
export const reportCreateSchema = z
  .object({
    category_id: z.number({ invalid_type_error: "Pilih kategori." }).int().positive("Pilih kategori."),
    title: z.string().trim().min(5, "Judul minimal 5 karakter.").max(150, "Judul maksimal 150 karakter."),
    description: z.string().trim().min(15, "Uraian minimal 15 karakter.").max(2000, "Uraian maksimal 2000 karakter."),
    location_text: z.string().trim().min(5, "Lokasi minimal 5 karakter.").max(255, "Lokasi maksimal 255 karakter."),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine((d) => (d.latitude == null) === (d.longitude == null), {
    message: "Koordinat harus lengkap (lintang dan bujur).",
  });

export const statusUpdateSchema = z
  .object({
    status: z.enum(STATUSES, { errorMap: () => ({ message: "Status tidak valid." }) }),
    note: z.string().trim().max(1000, "Catatan maksimal 1000 karakter.").optional(),
  })
  .refine((d) => d.status !== "ditolak" || (d.note && d.note.length >= 5), {
    message: "Alasan penolakan wajib diisi (minimal 5 karakter).",
    path: ["note"],
  });

export const reportUpdateSchema = z
  .object({
    status: z.enum(STATUSES, { errorMap: () => ({ message: "Status tidak valid." }) }).optional(),
    note: z.string().trim().max(1000, "Catatan maksimal 1000 karakter.").optional(),
    assigned_to: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.status !== undefined || d.assigned_to !== undefined || (d.note && d.note.length > 0), {
    message: "Tidak ada perubahan.",
  })
  .refine((d) => d.status !== "ditolak" || (d.note && d.note.length >= 5), {
    message: "Alasan penolakan wajib diisi (minimal 5 karakter).",
    path: ["note"],
  });

export const notificationPatchSchema = z
  .object({
    all: z.boolean().optional(),
    id: z.number().int().positive().optional(),
  })
  .refine((d) => d.all === true || d.id !== undefined, { message: "Tidak ada perubahan." });

export const adminUserCreateSchema = z.object({
  name,
  email,
  password,
  role: z.enum(ROLES),
});

export const adminUserPatchSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => d.role !== undefined || d.is_active !== undefined, { message: "Tidak ada perubahan." });

const slaHours = z.coerce
  .number({ invalid_type_error: "Target waktu harus berupa angka." })
  .int("Target waktu harus bilangan bulat.")
  .min(1, "Target waktu minimal 1 jam.")
  .max(8760, "Target waktu maksimal 8760 jam (1 tahun).");

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(3, "Nama kategori minimal 3 karakter.").max(80),
  description: z.string().trim().max(255).optional(),
  sla_hours: slaHours.optional(),
});

export const categoryPatchSchema = z
  .object({
    name: z.string().trim().min(3).max(80).optional(),
    description: z.string().trim().max(255).optional(),
    sla_hours: slaHours.optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Tidak ada perubahan." });

export const ratingSchema = z.object({
  device_token: z.string().min(16, "Token perangkat tidak valid.").max(128),
  stars: z.number({ invalid_type_error: "Pilih jumlah bintang." }).int().min(1, "Pilih jumlah bintang.").max(5, "Pilih jumlah bintang."),
  comment: z.string().trim().max(500, "Komentar maksimal 500 karakter.").optional(),
});

export const preferencesSchema = z
  .object({
    notify_email: z.boolean().optional(),
    notify_wa: z.boolean().optional(),
  })
  .refine((d) => d.notify_email !== undefined || d.notify_wa !== undefined, { message: "Tidak ada perubahan." });
