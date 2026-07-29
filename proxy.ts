import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This project runs on a Next.js version where `middleware.ts` was renamed
// to `proxy.ts` (export `proxy`, not `middleware`) — see AGENTS.md.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Triggers a token refresh when needed and keeps the session cookie
  // current — must not be skipped even though the result isn't used below.
  const { data } = await supabase.auth.getClaims();

  // Optimistic, coarse check only. This is defense in depth, not the real
  // authorization boundary — each API route re-verifies the session and
  // role itself (see lib/auth/require-user.ts), since a proxy matcher
  // exclusion doesn't reliably protect every request path.
  if (request.nextUrl.pathname.startsWith("/api/") && !data?.claims) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest|js)$).*)"],
};
