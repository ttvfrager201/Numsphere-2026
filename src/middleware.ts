import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // 🔹 Supabase SSR client setup (keep your version)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies
            .getAll()
            .map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // ✅ Extract subdomain
  const host = req.headers.get("host") || "";
  const parts = host.split(".");
  const subdomain = parts[0];

  // Tempo uses `canvases.tempo.build`, so we ignore those
  const isTempoBase =
    host.includes("canvases.tempo.build") || host.includes("localhost");

  // Only rewrite if it's a real business subdomain
  if (!isTempoBase && subdomain && subdomain !== "www") {
    const url = req.nextUrl.clone();
    url.pathname = `/business/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api/payments/webhook).*)",
  ],
};
