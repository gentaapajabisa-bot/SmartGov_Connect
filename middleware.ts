import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Gerbang awal: tanpa token valid, /dashboard dialihkan ke /login.
// Pemeriksaan peran dan status akun yang sebenarnya dilakukan di server (lib/auth.ts).
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sgc_session")?.value;
  const secret = process.env.AUTH_SECRET;

  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      // token tidak valid atau kedaluwarsa -> jatuh ke pengalihan
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*"] };
