// Migrasi untuk database yang SUDAH dibuat dengan versi lama.
// Aman dijalankan berulang kali. Pemakaian: npm run db:migrate
//  - membuat tabel baru (report_photos, notifications, auth_tokens, rate_limits, audit_log) bila belum ada
//  - menambah kolom reports.assigned_to, users.email_verified_at/consent_at, categories.sla_hours, report_photos.kind bila belum ada
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
async function indexExists(table, index) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
    [table, index]
  );
  return rows.length > 0;
}

try {
  // 1) Tabel baru + data awal: schema.sql seluruhnya memakai IF NOT EXISTS / INSERT IGNORE.
  const sql = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) await conn.query(stmt);
  console.log(`Skema dasar diperiksa (${statements.length} pernyataan).`);

  // 2) Perubahan pada tabel lama
  if (!(await columnExists("reports", "assigned_to"))) {
    await conn.query("ALTER TABLE reports ADD COLUMN assigned_to BIGINT NULL AFTER handled_by");
    console.log("Kolom reports.assigned_to ditambahkan.");
  } else {
    console.log("Kolom reports.assigned_to sudah ada.");
  }
  if (!(await indexExists("reports", "idx_reports_assigned"))) {
    await conn.query("ALTER TABLE reports ADD KEY idx_reports_assigned (assigned_to, status)");
    console.log("Indeks idx_reports_assigned ditambahkan.");
  }

  // Kolom baru pada users (tahap keamanan). Akun yang sudah ada dianggap terverifikasi
  // dan dianggap sudah menyetujui saat mendaftar, agar tidak tiba-tiba terkunci/terganggu.
  if (!(await columnExists("users", "email_verified_at"))) {
    await conn.query("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL");
    await conn.query("UPDATE users SET email_verified_at = created_at");
    console.log("Kolom users.email_verified_at ditambahkan.");
  }
  if (!(await columnExists("users", "consent_at"))) {
    await conn.query("ALTER TABLE users ADD COLUMN consent_at TIMESTAMP NULL");
    await conn.query("UPDATE users SET consent_at = created_at");
    console.log("Kolom users.consent_at ditambahkan.");
  }
  // Tahap 2: SLA per kategori dan jenis foto.
  if (!(await columnExists("categories", "sla_hours"))) {
    await conn.query("ALTER TABLE categories ADD COLUMN sla_hours INT NOT NULL DEFAULT 168");
    // Nilai awal yang masuk akal; admin dapat mengubahnya di tab Kategori.
    const defaults = [
      ["Keamanan & Ketertiban", 24],
      ["Kebersihan & Sampah", 72],
      ["Penerangan Jalan", 72],
      ["Pelayanan Administrasi", 72],
      ["Jalan & Infrastruktur", 168],
      ["Lainnya", 168],
    ];
    for (const [name, h] of defaults) await conn.query("UPDATE categories SET sla_hours = ? WHERE name = ?", [h, name]);
    console.log("Kolom categories.sla_hours ditambahkan.");
  }
  if (!(await columnExists("report_photos", "kind"))) {
    await conn.query("ALTER TABLE report_photos ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'report'");
    console.log("Kolom report_photos.kind ditambahkan.");
  }
  // Tahap 3: preferensi notifikasi.
  if (!(await columnExists("users", "notify_email"))) {
    await conn.query("ALTER TABLE users ADD COLUMN notify_email TINYINT(1) NOT NULL DEFAULT 1");
    console.log("Kolom users.notify_email ditambahkan.");
  }
  if (!(await columnExists("users", "notify_wa"))) {
    await conn.query("ALTER TABLE users ADD COLUMN notify_wa TINYINT(1) NOT NULL DEFAULT 0");
    console.log("Kolom users.notify_wa ditambahkan.");
  }
  console.log("Migrasi selesai.");
} finally {
  await conn.end();
}
