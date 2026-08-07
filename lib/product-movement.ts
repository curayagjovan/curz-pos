import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";

export type ProductMovementEntry = {
  productId: string;
  name: string;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  activeDays: number;
  consistency: number;
};

export type ProductMovementReport = {
  windowDays: number;
  popular: ProductMovementEntry[];
  leastPopular: ProductMovementEntry[];
  running: ProductMovementEntry[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_SIZE = 15;
// "Running" means steady, not just present — a product that sold once
// shouldn't outrank one that sells in small amounts every day.
const MIN_ORDERS_FOR_RUNNING = 3;

// Ranks the catalog three ways over a fixed trailing window of PAID orders:
// best sellers by volume, worst sellers by volume (including products that
// never sold at all — they're the least popular by definition), and the
// steadiest sellers by how many distinct days they appeared in, not how much
// they sold on any one of them.
export function computeProductMovement(
  products: Product[],
  paidTransactions: Transaction[],
  analysisTimeMs: number,
  windowDays = 30,
): ProductMovementReport {
  const windowStartMs = analysisTimeMs - windowDays * DAY_MS;

  const summaryByName = new Map<
    string,
    {
      quantitySold: number;
      orderCount: number;
      revenue: number;
      activeDays: Set<string>;
    }
  >();

  for (const transaction of paidTransactions) {
    const createdAtMs = new Date(transaction.createdAt).getTime();
    if (
      !Number.isFinite(createdAtMs) ||
      createdAtMs < windowStartMs ||
      createdAtMs > analysisTimeMs
    ) {
      continue;
    }

    const dayToken = new Date(transaction.createdAt).toISOString().slice(0, 10);
    const countedInOrder = new Set<string>();

    for (const item of transaction.items) {
      const key = item.productName.trim().toLowerCase();
      if (!key) {
        continue;
      }

      const netQuantity = Number(item.quantity) - Number(item.returnedQuantity ?? 0);
      const lineTotal = Number(item.lineTotal);

      const current = summaryByName.get(key) ?? {
        quantitySold: 0,
        orderCount: 0,
        revenue: 0,
        activeDays: new Set<string>(),
      };

      current.quantitySold += Number.isFinite(netQuantity)
        ? Math.max(netQuantity, 0)
        : 0;
      current.revenue += Number.isFinite(lineTotal) ? lineTotal : 0;
      current.activeDays.add(dayToken);

      if (!countedInOrder.has(key)) {
        current.orderCount += 1;
        countedInOrder.add(key);
      }

      summaryByName.set(key, current);
    }
  }

  const entries: ProductMovementEntry[] = products.map((product) => {
    const summary = summaryByName.get(product.name.trim().toLowerCase());
    const activeDays = summary?.activeDays.size ?? 0;

    return {
      productId: product.id,
      name: product.name,
      quantitySold: summary?.quantitySold ?? 0,
      orderCount: summary?.orderCount ?? 0,
      revenue: summary?.revenue ?? 0,
      activeDays,
      consistency: activeDays / windowDays,
    };
  });

  const popular = [...entries]
    .filter((entry) => entry.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
    .slice(0, LIST_SIZE);

  const leastPopular = [...entries]
    .sort(
      (a, b) => a.quantitySold - b.quantitySold || a.name.localeCompare(b.name),
    )
    .slice(0, LIST_SIZE);

  const running = [...entries]
    .filter((entry) => entry.orderCount >= MIN_ORDERS_FOR_RUNNING)
    .sort((a, b) => b.consistency - a.consistency || b.orderCount - a.orderCount)
    .slice(0, LIST_SIZE);

  return { windowDays, popular, leastPopular, running };
}
