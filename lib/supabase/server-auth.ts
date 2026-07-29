import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

// For Route Handlers and Server Components — reads the session from cookies.
// Writing cookies only succeeds from a Route Handler/Server Action; Server
// Component renders can't set cookies, so setAll no-ops there (the session
// refresh that matters happens in proxy.ts on every request regardless).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called during a Server Component render — cookies() is
          // read-only there. Safe to ignore; proxy.ts keeps the session
          // cookie fresh on every request.
        }
      },
    },
  });
}
