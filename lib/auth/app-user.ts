import type { AppUser } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

// Authorization source of truth is our own AppUser table, keyed by email —
// not Supabase's auth.users. An Owner must pre-create a row before someone
// can ever get in; matched by email and linked lazily on first login.
export async function getAppUserForAuthUser(
  authUser: User,
): Promise<AppUser | null> {
  const email = authUser.email?.trim().toLowerCase();
  if (!email) {
    return null;
  }

  const appUser = await prisma.appUser.findUnique({ where: { email } });
  if (!appUser || !appUser.isActive) {
    return null;
  }

  if (appUser.authUserId === authUser.id && appUser.lastLoginAt) {
    return appUser;
  }

  return prisma.appUser.update({
    where: { id: appUser.id },
    data: { authUserId: authUser.id, lastLoginAt: new Date() },
  });
}
