import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

// The store operates in the Philippines (fixed UTC+8, no DST) but this route
// can run on a server configured in any timezone (commonly UTC on most
// hosts) — using local-time Date methods here would bucket orders into the
// wrong day/week/month/year depending purely on where the process happens to
// run, disagreeing with the client's browser-local (Asia/Manila) totals.
// Shifting into a synthetic UTC clock offset by the store's fixed offset
// lets us use the UTC getters/Date.UTC (which never consult process TZ) to
// get PH wall-clock calendar fields deterministically, then shift back.
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

function toPhShifted(date: Date) {
  return new Date(date.getTime() + PH_OFFSET_MS);
}

function fromPhShifted(shifted: Date) {
  return new Date(shifted.getTime() - PH_OFFSET_MS);
}

function startOfDay(date: Date) {
  const shifted = toPhShifted(date);
  const dayStart = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return fromPhShifted(new Date(dayStart));
}

function startOfWeek(date: Date) {
  const shifted = toPhShifted(date);
  const day = shifted.getUTCDay();
  const weekStart = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - (day === 0 ? 6 : day - 1),
  );
  return fromPhShifted(new Date(weekStart));
}

function startOfMonth(date: Date) {
  const shifted = toPhShifted(date);
  const monthStart = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
  return fromPhShifted(new Date(monthStart));
}

function startOfYear(date: Date) {
  const shifted = toPhShifted(date);
  const yearStart = Date.UTC(shifted.getUTCFullYear(), 0, 1);
  return fromPhShifted(new Date(yearStart));
}

// Boundaries above always land exactly on PH midnight, and PH never
// observes DST, so a calendar day is always exactly 24 real-world hours —
// plain millisecond arithmetic is safe for day increments.
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(date: Date, months: number) {
  const shifted = toPhShifted(date);
  const result = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + months,
    shifted.getUTCDate(),
  );
  return fromPhShifted(new Date(result));
}

function addYears(date: Date, years: number) {
  const shifted = toPhShifted(date);
  const result = Date.UTC(
    shifted.getUTCFullYear() + years,
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return fromPhShifted(new Date(result));
}

type PeriodSummary = {
  rangeStart: string;
  rangeEnd: string;
  salesTotal: number;
  netSalesTotal: number;
  refundedTotal: number;
  voidedTotal: number;
  voidedCount: number;
  pendingTotal: number;
  pendingCount: number;
  orderCount: number;
};

type GroupByRow = {
  status: string;
  _sum: { total: unknown; refundAmount: unknown; amountPaid: unknown };
  _count: { _all: number };
};

// Load and e-wallet sales are checked out as Product rows seeded with unit
// "load"/"ewallet" (see prisma/seed-mobile-loads.ts,
// prisma/seed-ewallet-items.ts), and each such order only ever contains a
// single item, so filtering on "some item has that unit" is equivalent to
// filtering on the whole order's category — mirrors
// app/components/transaction-card-status-utils.ts's getSaleCategory().
function categoryWhere(category: string | null): Prisma.OrderWhereInput {
  if (category === "load_ewallet") {
    return {
      items: { some: { product: { unit: { in: ["load", "ewallet"] } } } },
    };
  }

  if (category === "product") {
    return {
      items: { none: { product: { unit: { in: ["load", "ewallet"] } } } },
    };
  }

  return {};
}

function rangeQuery(start: Date, end: Date, category: string | null) {
  return prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: start, lt: end }, ...categoryWhere(category) },
    _sum: { total: true, refundAmount: true, amountPaid: true },
    _count: { _all: true },
  });
}

function reduceRows(rows: GroupByRow[], start: Date, end: Date): PeriodSummary {
  let salesTotal = 0;
  let refundedTotal = 0;
  let voidedTotal = 0;
  let voidedCount = 0;
  let pendingTotal = 0;
  let pendingCount = 0;
  let orderCount = 0;

  for (const row of rows) {
    const total = Number(row._sum.total ?? 0);
    const refundAmount = Number(row._sum.refundAmount ?? 0);
    const amountPaid = Number(row._sum.amountPaid ?? 0);
    orderCount += row._count._all;

    // PAID/REFUNDED always have amountPaid >= total (cash tendered can
    // exceed the total, with change handed back), so `total` — not
    // amountPaid — is the actual revenue contribution here.
    if (row.status === "PAID" || row.status === "REFUNDED") {
      salesTotal += Number.isFinite(total) ? total : 0;
    }

    if (row.status === "REFUNDED") {
      refundedTotal += Number.isFinite(refundAmount) ? refundAmount : 0;
    }

    if (row.status === "VOIDED") {
      voidedTotal += Number.isFinite(total) ? total : 0;
      voidedCount += row._count._all;
    }

    // Items already taken but not yet fully paid for. Whatever has actually
    // been collected against a PENDING order (amountPaid, always <= total)
    // is real money in hand, so it counts toward sales now; only the
    // outstanding balance (total - amountPaid) is reported as "pending".
    if (row.status === "PENDING") {
      const paid = Number.isFinite(amountPaid) ? amountPaid : 0;
      const orderTotal = Number.isFinite(total) ? total : 0;
      salesTotal += paid;
      pendingTotal += Math.max(0, orderTotal - paid);
      pendingCount += row._count._all;
    }
  }

  return {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    salesTotal: Number(salesTotal.toFixed(2)),
    netSalesTotal: Number((salesTotal - refundedTotal).toFixed(2)),
    refundedTotal: Number(refundedTotal.toFixed(2)),
    voidedTotal: Number(voidedTotal.toFixed(2)),
    voidedCount,
    pendingTotal: Number(pendingTotal.toFixed(2)),
    pendingCount,
    orderCount,
  };
}

// Day/week/month/year totals anchored to a reference date, aggregated
// server-side (Prisma groupBy + sum) instead of shipping raw order rows to
// the client — the month and year ranges can span far more orders than the
// existing /api/orders?from=&to= endpoint's 2000-row cap comfortably covers.
// The four queries run as one batched $transaction rather than
// Promise.all — independent calls each pay their own connection round-trip
// against the pool, which measured ~3x slower than a single batched request.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const dateParam = url.searchParams.get("date");
    const parsedDate = dateParam ? new Date(dateParam) : new Date();
    const referenceDate = Number.isNaN(parsedDate.getTime())
      ? new Date()
      : parsedDate;

    const dayStart = startOfDay(referenceDate);
    const weekStart = startOfWeek(referenceDate);
    const monthStart = startOfMonth(referenceDate);
    const yearStart = startOfYear(referenceDate);

    const dayRange: [Date, Date] = [dayStart, addDays(dayStart, 1)];
    const weekRange: [Date, Date] = [weekStart, addDays(weekStart, 7)];
    const monthRange: [Date, Date] = [monthStart, addMonths(monthStart, 1)];
    const yearRange: [Date, Date] = [yearStart, addYears(yearStart, 1)];

    const [dayRows, weekRows, monthRows, yearRows] = await prisma.$transaction([
      rangeQuery(...dayRange, category),
      rangeQuery(...weekRange, category),
      rangeQuery(...monthRange, category),
      rangeQuery(...yearRange, category),
    ]);

    return NextResponse.json({
      day: reduceRows(dayRows, ...dayRange),
      week: reduceRows(weekRows, ...weekRange),
      month: reduceRows(monthRows, ...monthRange),
      year: reduceRows(yearRows, ...yearRange),
    });
  } catch (error) {
    console.error("Failed to load sales summary", error);
    return NextResponse.json(
      { message: "Unable to load sales summary" },
      { status: 500 },
    );
  }
}
