// Migrasi untuk memperbarui database ke mode warga anonim tanpa login.
// Aman dijalankan berulang kali: npm run db:migrate
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const { TIDB_HOST, TIDB_PORT, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
if (!TIDB_HOST || !TIDB_USER || !TIDB_PASSWORD || !TIDB_DATABASE) {
  console.error("Variabel TIDB_* belum lengkap. Isi .env.local terlebih dahulu.");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: TIDB_HOST,
  port: Number(TIDB_PORT || 4000),
  user: TIDB_USER,
  password: TIDB_PASSWORD,
  database: TIDB_DATABASE,
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
});

async function columnExists(table, column) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1",
    [table, column]
  );
  return rows.length > 0;
}

try {
  const sql = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) await conn.query(stmt);

  // Hapus akun warga lama agar hanya petugas & admin yang memiliki kredensial
  await conn.query("DELETE FROM users WHERE role = 'warga'");
  await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('petugas','admin') NOT NULL DEFAULT 'petugas'");

  if (!(await columnExists("reports", "device_token_hash"))) {
    await conn.query("ALTER TABLE reports ADD COLUMN device_token_hash CHAR(64) NOT NULL DEFAULT '' AFTER ticket_no");
  }
  await conn.query("ALTER TABLE reports MODIFY COLUMN user_id BIGINT NULL");
  await conn.query("UPDATE reports SET user_id = NULL, is_anonymous = 1");
  await conn.query("ALTER TABLE report_status_history MODIFY COLUMN changed_by BIGINT NULL");

  if (await columnExists("report_ratings", "user_id")) {
    await conn.query("ALTER TABLE report_ratings DROP COLUMN user_id");
  }
  if (await columnExists("report_votes", "user_id")) {
    await conn.query("DROP TABLE IF EXISTS report_votes");
    await conn.query(`CREATE TABLE report_votes (
      report_id  BIGINT      NOT NULL,
      voter_key  VARCHAR(64) NOT NULL,
      created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id, voter_key)
    )`);
  }

  console.log("Migrasi ke mode anonim selesai.");
} finally {
  await conn.end();
}
