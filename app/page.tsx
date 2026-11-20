import { pool } from "@/lib/db";
import PublicHub from "@/components/PublicHub";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let categories: any[] = [];
  try {
    const db = pool();
    const [rows]: any = await db.query(
      `SELECT c.id, c.name, a.short_name AS agency_name
       FROM categories c
       LEFT JOIN agencies a ON c.agency_id = a.id
       WHERE c.is_active = 1
       ORDER BY c.id ASC`
    );
    categories = rows;
  } catch {
    categories = [];
  }

  return <PublicHub categories={categories} />;
}
