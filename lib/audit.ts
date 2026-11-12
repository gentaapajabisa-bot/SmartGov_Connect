import { pool } from "./db";

/** Mencatat tindakan admin. Kegagalan mencatat tidak boleh menggagalkan tindakan utama. */
export async function audit(
  actorId: number,
  action: string,
  target?: { type: string; id?: number | null },
  detail?: string
): Promise<void> {
  try {
    await pool().query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)",
      [actorId, action, target?.type ?? null, target?.id ?? null, detail ? detail.slice(0, 500) : null]
    );
  } catch (err) {
    console.error("[audit] gagal mencatat:", err);
  }
}
