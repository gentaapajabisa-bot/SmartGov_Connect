import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __sgcPool: Pool | undefined;
}

function createPool(): Pool {
  const { TIDB_HOST, TIDB_PORT, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
  if (!TIDB_HOST || !TIDB_USER || !TIDB_PASSWORD || !TIDB_DATABASE) {
    throw new Error("Konfigurasi database belum lengkap. Periksa variabel TIDB_* pada environment.");
  }

  const pool = mysql.createPool({
    host: TIDB_HOST,
    port: Number(TIDB_PORT || 4000),
    user: TIDB_USER,
    password: TIDB_PASSWORD,
    database: TIDB_DATABASE,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    timezone: "Z",
    waitForConnections: true,
    // Pool kecil: di Vercel setiap instance serverless punya pool sendiri.
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 30_000,
    enableKeepAlive: true,
  });

  // Seragamkan zona waktu sesi ke UTC; tampilan lokal dilakukan di sisi klien.
  type CorePool = { on: (event: "connection", cb: (conn: { query: (sql: string) => unknown }) => void) => void };
  (pool as unknown as { pool: CorePool }).pool.on("connection", (conn) => {
    conn.query("SET time_zone = '+00:00'");
  });

  return pool;
}

/** Pool dipakai ulang antar hot-reload (dev) dan antar invokasi pada instance yang sama (Vercel). */
export function pool(): Pool {
  if (!globalThis.__sgcPool) globalThis.__sgcPool = createPool();
  return globalThis.__sgcPool;
}

export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool().query<T[]>(sql, params);
  return rows;
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export function isDuplicate(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ER_DUP_ENTRY";
}
