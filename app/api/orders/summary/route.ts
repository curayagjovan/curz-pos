import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}

type PeriodSummary = {
  rangeStart: string;
  rangeEnd: string;
  salesTotal: number;
  netSalesTotal: number;
  refundedTotal: number;
  voidedTotal: number;
  voidedCount: number;
  orderCount: number;
};

type GroupByRow = {
  status: string;
  _sum: { total: unknown; refundAmount: unknown };
  _count: { _all: number };
};

function rangeQuery(start: Date, end: Date) {
  return prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: start, lt: end } },
    _sum: { total: true, refundAmount: true },
    _count: { _all: true },
  });
}

function reduceRows(rows: GroupByRow[], start: Date, end: Date): PeriodSummary {
  let salesTotal = 0;
  let refundedTotal = 0;
  let voidedTotal = 0;
  let voidedCount = 0;
  let orderCount = 0;

  for (const row of rows) {
    const total = Number(row._sum.total ?? 0);
    const refundAmount = Number(row._sum.refundAmount ?? 0);
    orderCount += row._count._all;

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
  }

  return {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    salesTotal: Number(salesTotal.toFixed(2)),
    netSalesTotal: Number((salesTotal - refundedTotal).toFixed(2)),
    refundedTotal: Number(refundedTotal.toFixed(2)),
    voidedTotal: Number(voidedTotal.toFixed(2)),
    voidedCount,
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
  try {
    const url = new URL(request.url);
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
      rangeQuery(...dayRange),
      rangeQuery(...weekRange),
      rangeQuery(...monthRange),
      rangeQuery(...yearRange),
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
