import { createHash, randomBytes } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool, query } from "./db";

export type TokenKind = "reset" | "verify";

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

/** Membuat token acak sekali pakai. Yang disimpan hanya hash-nya; token asli hanya ada di email. */
export async function createToken(userId: number, kind: TokenKind, ttlMinutes: number): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  // Token lama dengan jenis yang sama dibatalkan.
  await pool().query(
    "UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND kind = ? AND used_at IS NULL",
    [userId, kind]
  );
  await pool().query(
    "INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))",
    [userId, kind, sha(raw), ttlMinutes]
  );
  return raw;
}

interface TokenRow extends RowDataPacket {
  user_id: number;
}

/** Memakai token: berhasil sekali saja, dan hanya sebelum kedaluwarsa. Mengembalikan id pengguna atau null. */
export async function consumeToken(raw: string, kind: TokenKind): Promise<number | null> {
  if (!raw || raw.length > 100) return null;
  const hash = sha(raw);
  const [res] = await pool().query<ResultSetHeader>(
    "UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()",
    [hash, kind]
  );
  if (res.affectedRows !== 1) return null;
  const rows = await query<TokenRow>("SELECT user_id FROM auth_tokens WHERE token_hash = ? LIMIT 1", [hash]);
  return rows[0]?.user_id ?? null;
}
