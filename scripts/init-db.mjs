// Menjalankan database/schema.sql ke TiDB. Pemakaian: npm run db:init
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const { TIDB_HOST, TIDB_PORT, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
if (!TIDB_HOST || !TIDB_USER || !TIDB_PASSWORD || !TIDB_DATABASE) {
  console.error("Variabel TIDB_* belum lengkap. Isi .env.local terlebih dahulu.");
  process.exit(1);
}

const sql = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
const statements = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const conn = await mysql.createConnection({
  host: TIDB_HOST,
  port: Number(TIDB_PORT || 4000),
  user: TIDB_USER,
  password: TIDB_PASSWORD,
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
});

try {
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TIDB_DATABASE}\``);
  await conn.query(`USE \`${TIDB_DATABASE}\``);
  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log(`Selesai: ${statements.length} pernyataan SQL dijalankan pada database "${TIDB_DATABASE}".`);
} finally {
  await conn.end();
}
