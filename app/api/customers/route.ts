import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, diffFields, recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const [customers, balances] = await Promise.all([
    prisma.customer.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    }),
    // Outstanding balance is derived, not stored, so it can never drift from
    // the orders it's based on — sum(total) - sum(amountPaid) across a
    // customer's unpaid orders.
    prisma.order.groupBy({
      by: ["customerId"],
      where: { status: "PENDING", customerId: { not: null } },
      _sum: { total: true, amountPaid: true },
    }),
  ]);

  const balanceByCustomerId = new Map(
    balances.map((row) => [
      row.customerId as string,
      Number(row._sum.total ?? 0) - Number(row._sum.amountPaid ?? 0),
    ]),
  );

  const customersWithBalance = customers.map((customer) => ({
    ...customer,
    balance: Number((balanceByCustomerId.get(customer.id) ?? 0).toFixed(2)),
  }));

  return NextResponse.json(customersWithBalance);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    note?: string;
  };

  const name = body.name?.trim();
  const phone = body.phone?.trim() || null;
  const note = body.note?.trim() || null;

  if (!name) {
    return NextResponse.json(
      { message: "A name is required" },
      { status: 400 },
    );
  }

  try {
    const customer = await prisma.customer.create({
      data: { name, phone, note },
    });

    await recordAudit({
      actor: auth.appUser,
      action: AUDIT_ACTIONS.CUSTOMER_CREATE,
      entityType: "Customer",
      entityId: customer.id,
      summary: `Added customer ${customer.name}`,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to add customer", error);
    return NextResponse.json(
      { message: "Unable to add customer" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    phone?: string;
    note?: string;
    isActive?: boolean;
  };

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  const nextValues = {
    ...(body.name !== undefined ? { name: body.name.trim() } : {}),
    ...(body.phone !== undefined ? { phone: body.phone.trim() || null } : {}),
    ...(body.note !== undefined ? { note: body.note.trim() || null } : {}),
    ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
  };

  if (nextValues.name === "") {
    return NextResponse.json(
      { message: "A name is required" },
      { status: 400 },
    );
  }

  try {
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { name: true, phone: true, note: true, isActive: true },
    });

    const customer = await prisma.customer.update({
      where: { id },
      data: nextValues,
    });

    if (existingCustomer) {
      const changes = diffFields(existingCustomer, nextValues);

      if (Object.keys(changes).length > 0) {
        await recordAudit({
          actor: auth.appUser,
          action: AUDIT_ACTIONS.CUSTOMER_UPDATE,
          entityType: "Customer",
          entityId: customer.id,
          summary: `Updated customer ${customer.name}`,
          changes,
        });
      }
    }

    return NextResponse.json(customer);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 },
      );
    }

    console.error("Failed to update customer", error);
    return NextResponse.json(
      { message: "Unable to update customer" },
      { status: 500 },
    );
  }
}
