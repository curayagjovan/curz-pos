import { NextResponse } from "next/server";
import type { AppPermission, AppUser } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-auth";
import { getAppUserForAuthUser } from "@/lib/auth/app-user";
import { hasPermission } from "@/lib/auth/permissions";

type AuthSuccess = { ok: true; authUser: User; appUser: AppUser };
type AuthFailure = { ok: false; response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

// Call as the first line of a Route Handler:
//   const auth = await requireUser();
//   if (!auth.ok) return auth.response;
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const appUser = await getAppUserForAuthUser(authUser);
  if (!appUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Your account isn't authorized. Ask your Owner for access." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, authUser, appUser };
}

// Same as requireUser(), but also requires the OWNER role.
export async function requireOwner(): Promise<AuthResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  if (auth.appUser.role !== "OWNER") {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Only the Owner can do this" },
        { status: 403 },
      ),
    };
  }

  return auth;
}

// Same as requireUser(), but also requires the given permission (which
// Owner always implicitly has — see hasPermission()).
export async function requirePermission(
  permission: AppPermission,
): Promise<AuthResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  if (!hasPermission(auth.appUser, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "You don't have permission to do this" },
        { status: 403 },
      ),
    };
  }

  return auth;
}
