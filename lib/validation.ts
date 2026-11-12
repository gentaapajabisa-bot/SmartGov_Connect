import { z } from "zod";
import { ROLES, STATUSES } from "./types";

const email = z.string().trim().toLowerCase().email("Email tidak valid.").max(150, "Email terlalu panjang.");

const password = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.")
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
  .regex(/[0-9]/, "Kata sandi harus memuat angka.");

const phone = z
  .string()
  .trim()
  .regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid (contoh: 081234567890).")
  .optional()
  .or(z.literal(""));

const name = z.string().trim().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter.");

export const registerSchema = z.object({ name, email, phone, password });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Kata sandi wajib diisi.").max(72),
});

export const reportCreateSchema = z
  .object({
    category_id: z.number({ invalid_type_error: "Pilih kategori." }).int().positive("Pilih kategori."),
    title: z.string().trim().min(5, "Judul minimal 5 karakter.").max(150, "Judul maksimal 150 karakter."),
    description: z.string().trim().min(20, "Uraian minimal 20 karakter.").max(2000, "Uraian maksimal 2000 karakter."),
    location_text: z.string().trim().min(5, "Lokasi minimal 5 karakter.").max(255, "Lokasi maksimal 255 karakter."),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    is_anonymous: z.boolean().default(false),
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

/** Perubahan laporan oleh staf: status/catatan, penugasan, atau keduanya. */
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

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(3, "Nama kategori minimal 3 karakter.").max(80),
  description: z.string().trim().max(255).optional(),
});

export const categoryPatchSchema = z
  .object({
    name: z.string().trim().min(3).max(80).optional(),
    description: z.string().trim().max(255).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Tidak ada perubahan." });
