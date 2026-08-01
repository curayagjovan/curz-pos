import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

function parseFirstPeso(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/₱\s*([\d,]+(?:\.\d{1,2})?)/);
  if (!match) {
    return null;
  }

  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

async function main() {
  console.log(`[Load/E-Wallet Backfill] Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

  const loadItems = await prisma.loadItem.findMany({
    select: { id: true, amount: true },
  });
  const loadAmountById = new Map(loadItems.map((li) => [li.id, Number(li.amount)]));

  const items = await prisma.orderItem.findMany({
    where: { product: { unit: { in: ["load", "ewallet"] } } },
    select: {
      id: true,
      orderId: true,
      productId: true,
      productName: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      returnedQuantity: true,
      product: { select: { unit: true } },
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          total: true,
          amountPaid: true,
          refundAmount: true,
          note: true,
          items: { select: { id: true } },
        },
      },
    },
  });

  console.log(`[Load/E-Wallet Backfill] Found ${items.length} order item(s).`);

  const toUpdate: Array<{
    itemId: string;
    orderId: string;
    orderNo: string;
    status: string;
    productName: string;
    faceValue: number;
    oldUnitPrice: number;
    newUnitPrice: number;
    oldTotal: number;
    oldAmountPaid: number | null;
    oldRefundAmount: number | null;
  }> = [];

  let skippedMultiItem = 0;
  let skippedNoFaceValue = 0;
  let skippedAlreadyCorrect = 0;

  for (const item of items) {
    if (item.order.items.length > 1) {
      skippedMultiItem++;
      continue;
    }

    const oldUnitPrice = Number(item.unitPrice);
    const faceValue =
      item.product.unit === "load"
        ? (loadAmountById.get(item.productId) ?? parseFirstPeso(item.productName))
        : (parseFirstPeso(item.order.note) ?? parseFirstPeso(item.productName));

    if (faceValue === null || !Number.isFinite(faceValue) || faceValue <= 0) {
      skippedNoFaceValue++;
      if (process.env.DEBUG_SKIPS) {
        console.log(
          `  [no face value] ${item.order.orderNo} "${item.productName}" note="${item.order.note}"`,
        );
      }
      continue;
    }

    if (!(oldUnitPrice < faceValue)) {
      // Already includes the face value (or predates markup tracking
      // entirely) — leave it alone rather than guess at history.
      skippedAlreadyCorrect++;
      if (process.env.DEBUG_SKIPS) {
        console.log(
          `  [already correct] ${item.order.orderNo} "${item.productName}" unitPrice=${oldUnitPrice} faceValue=${faceValue}`,
        );
      }
      continue;
    }

    const newUnitPrice = Number((faceValue + oldUnitPrice).toFixed(2));

    toUpdate.push({
      itemId: item.id,
      orderId: item.order.id,
      orderNo: item.order.orderNo,
      status: item.order.status,
      productName: item.productName,
      faceValue,
      oldUnitPrice,
      newUnitPrice,
      oldTotal: Number(item.order.total),
      oldAmountPaid: item.order.amountPaid === null ? null : Number(item.order.amountPaid),
      oldRefundAmount:
        item.order.refundAmount === null ? null : Number(item.order.refundAmount),
    });
  }

  console.log(
    `[Load/E-Wallet Backfill] Skipped ${skippedMultiItem} item(s) in multi-item orders (unexpected shape).`,
  );
  console.log(
    `[Load/E-Wallet Backfill] Skipped ${skippedNoFaceValue} item(s) with no recoverable face value.`,
  );
  console.log(
    `[Load/E-Wallet Backfill] Skipped ${skippedAlreadyCorrect} item(s) already correct.`,
  );
  console.log(`[Load/E-Wallet Backfill] ${toUpdate.length} item(s) need updating.\n`);

  const preview = toUpdate.slice(0, 25);
  for (const entry of preview) {
    console.log(
      `  ${entry.orderNo} [${entry.status}] "${entry.productName}": ₱${entry.oldUnitPrice.toFixed(2)} -> ₱${entry.newUnitPrice.toFixed(2)}`,
    );
  }
  if (toUpdate.length > preview.length) {
    console.log(`  ...and ${toUpdate.length - preview.length} more`);
  }

  const totalDelta = toUpdate.reduce(
    (sum, entry) => sum + (entry.newUnitPrice - entry.oldUnitPrice),
    0,
  );
  console.log(`\n[Load/E-Wallet Backfill] Total sales increase: ₱${totalDelta.toFixed(2)}`);

  const statusCounts = new Map<string, number>();
  for (const entry of toUpdate) {
    statusCounts.set(entry.status, (statusCounts.get(entry.status) ?? 0) + 1);
  }
  console.log(
    `[Load/E-Wallet Backfill] By status: ${Array.from(statusCounts.entries())
      .map(([status, count]) => `${status}=${count}`)
      .join(", ")}`,
  );

  if (!APPLY) {
    console.log("\n[Load/E-Wallet Backfill] Dry run only — pass --apply to write these changes.");
    return;
  }

  console.log("\n[Load/E-Wallet Backfill] Applying updates...");
  let applied = 0;

  for (const entry of toUpdate) {
    const delta = entry.newUnitPrice - entry.oldUnitPrice;
    const newTotal = Number((entry.oldTotal + delta).toFixed(2));
    const newAmountPaid =
      entry.status === "PENDING" || entry.oldAmountPaid === null
        ? entry.oldAmountPaid
        : Number((entry.oldAmountPaid + delta).toFixed(2));
    const newRefundAmount =
      entry.oldRefundAmount !== null && entry.oldRefundAmount > 0
        ? Number((entry.oldRefundAmount + delta).toFixed(2))
        : entry.oldRefundAmount;

    await prisma.$transaction([
      prisma.orderItem.update({
        where: { id: entry.itemId },
        data: { unitPrice: entry.newUnitPrice, lineTotal: entry.newUnitPrice },
      }),
      prisma.order.update({
        where: { id: entry.orderId },
        data: {
          total: newTotal,
          ...(newAmountPaid !== null ? { amountPaid: newAmountPaid } : {}),
          ...(newRefundAmount !== null ? { refundAmount: newRefundAmount } : {}),
        },
      }),
    ]);

    applied++;
  }

  console.log(`[Load/E-Wallet Backfill] Updated ${applied} order(s).`);
}

main()
  .catch((error) => {
    console.error("[Load/E-Wallet Backfill] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
