import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { query } from "./db";
import { HttpError } from "./http";
import type { Role, SessionUser } from "./types";

export const COOKIE_NAME = "sgc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET wajib diisi dengan minimal 32 karakter acak.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: { id: number; role: Role }): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: number;
}

/**
 * Membaca sesi dari cookie, lalu memuat ulang pengguna dari database.
 * Peran diambil dari database (bukan dari token) sehingga perubahan peran
 * atau penonaktifan akun berlaku seketika.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;

    const rows = await query<UserRow>(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    const row = rows[0];
    if (!row || !row.is_active) return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role };
  } catch {
    return null;
  }
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  if (roles && !roles.includes(user.role)) {
    throw new HttpError(403, "Anda tidak memiliki akses ke fitur ini.");
  }
  return user;
}

let dummyHash: string | null = null;
/** Dipakai agar waktu respons login tidak membocorkan apakah email terdaftar. */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= await bcrypt.hash("kata-sandi-pengecoh-1", 12);
  await bcrypt.compare(password, dummyHash);
}

export { bcrypt };
