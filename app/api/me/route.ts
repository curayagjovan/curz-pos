import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({
    email: auth.authUser.email,
    appUser: auth.appUser,
  });
}
