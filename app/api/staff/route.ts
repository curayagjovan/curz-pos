import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AUDIT_ACTIONS, diffFields, recordAudit } from "@/lib/audit";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  const staff = await prisma.appUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(staff);
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as {
    email?: string;
    role?: string;
    displayName?: string;
    sendInvite?: boolean;
  };

  const email = body.email?.trim().toLowerCase();
  const role = body.role === "OWNER" ? "OWNER" : "CASHIER";
  const displayName = body.displayName?.trim() || null;
  const sendInvite = body.sendInvite ?? true;

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { message: "A valid email is required" },
      { status: 400 },
    );
  }

  try {
    const staffMember = await prisma.appUser.create({
      data: { email, role, displayName },
    });

    await recordAudit({
      actor: auth.appUser,
      action: AUDIT_ACTIONS.STAFF_CREATE,
      entityType: "AppUser",
      entityId: staffMember.id,
      summary: `Added staff member ${staffMember.email} as ${staffMember.role}`,
    });

    if (sendInvite) {
      const origin = new URL(request.url).origin;
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: `${origin}/auth/callback` },
      );
      if (error) {
        console.error("Failed to send staff invite email", error);
      }
    }

    return NextResponse.json(staffMember, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { message: "That email is already added" },
        { status: 409 },
      );
    }

    console.error("Failed to add staff member", error);
    return NextResponse.json(
      { message: "Unable to add staff member" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as {
    id?: string;
    role?: string;
    isActive?: boolean;
    displayName?: string;
  };

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json(
      { message: "id is required" },
      { status: 400 },
    );
  }

  try {
    const existingStaffMember = await prisma.appUser.findUnique({
      where: { id },
      select: { role: true, isActive: true, displayName: true },
    });

    const staffMember = await prisma.appUser.update({
      where: { id },
      data: {
        ...(body.role === "OWNER" || body.role === "CASHIER"
          ? { role: body.role }
          : {}),
        ...(typeof body.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
        ...(body.displayName !== undefined
          ? { displayName: body.displayName?.trim() || null }
          : {}),
      },
    });

    if (existingStaffMember) {
      const changes = diffFields(existingStaffMember, {
        ...(body.role === "OWNER" || body.role === "CASHIER"
          ? { role: body.role }
          : {}),
        ...(typeof body.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
        ...(body.displayName !== undefined
          ? { displayName: body.displayName?.trim() || null }
          : {}),
      });

      if (Object.keys(changes).length > 0) {
        await recordAudit({
          actor: auth.appUser,
          action: AUDIT_ACTIONS.STAFF_UPDATE,
          entityType: "AppUser",
          entityId: staffMember.id,
          summary: `Updated staff member ${staffMember.email}`,
          changes,
        });
      }
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Staff member not found" },
        { status: 404 },
      );
    }

    console.error("Failed to update staff member", error);
    return NextResponse.json(
      { message: "Unable to update staff member" },
      { status: 500 },
    );
  }
}
