import { clearSessionCookie } from "@/lib/auth";
import { ok, run } from "@/lib/http";

export async function POST() {
  return run(async () => {
    clearSessionCookie();
    return ok({ success: true });
  });
}
