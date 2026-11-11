// Membuat (atau menaikkan) akun admin pertama. Pemakaian: npm run db:seed-admin
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const { TIDB_HOST, TIDB_PORT, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
const name = process.env.ADMIN_NAME || "Administrator";
const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!TIDB_HOST || !TIDB_USER || !TIDB_PASSWORD || !TIDB_DATABASE) {
  console.error("Variabel TIDB_* belum lengkap. Isi .env.local terlebih dahulu.");
  process.exit(1);
}
if (!email || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("Isi ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 8 karakter, memuat huruf dan angka) di .env.local.");
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

try {
  const hash = await bcrypt.hash(password, 12);
  await conn.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, 'admin', 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', is_active = 1`,
    [name, email, hash]
  );
  console.log(`Akun admin siap: ${email}`);
  console.log("Setelah berhasil masuk, hapus ADMIN_PASSWORD dari .env.local.");
} finally {
  await conn.end();
}
