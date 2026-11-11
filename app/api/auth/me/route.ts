import { requireUser } from "@/lib/auth";
import { ok, run } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return run(async () => ok({ user: await requireUser() }));
}
