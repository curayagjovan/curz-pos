import type { Transaction } from "@/types/transaction";

export type PopularProductCandidate = {
  productName: string;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  activeDays: Set<string>;
  velocity: number;
  penetration: number;
  consistency: number;
  score: number;
};

export type PopularProductsWindow = {
  selectedWindowDays: number;
  totalPaidOrdersInWindow: number;
  items: PopularProductCandidate[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function computeWindow(
  paidTransactions: Transaction[],
  analysisTimeMs: number,
  selectedWindowDays: number,
): PopularProductsWindow {
  const selectedTransactions = paidTransactions.filter((transaction) => {
    const createdAtMs = new Date(transaction.createdAt).getTime();
    return (
      Number.isFinite(createdAtMs) &&
      createdAtMs >= analysisTimeMs - selectedWindowDays * DAY_MS &&
      createdAtMs <= analysisTimeMs
    );
  });

  const summaryByProduct = new Map<
    string,
    Omit<PopularProductCandidate, "velocity" | "penetration" | "consistency" | "score"> & {
      velocity: number;
      penetration: number;
      consistency: number;
      score: number;
    }
  >();

  for (const transaction of selectedTransactions) {
    const countedInOrder = new Set<string>();
    const orderDate = new Date(transaction.createdAt);
    const orderDayToken = Number.isNaN(orderDate.getTime())
      ? null
      : orderDate.toISOString().slice(0, 10);

    for (const item of transaction.items) {
      const key = item.productName.trim().toLowerCase();
      if (!key) {
        continue;
      }

      const quantity = Number(item.quantity);
      const lineTotal = Number(item.lineTotal);
      const current = summaryByProduct.get(key) ?? {
        productName: item.productName,
        quantitySold: 0,
        orderCount: 0,
        revenue: 0,
        activeDays: new Set<string>(),
        velocity: 0,
        penetration: 0,
        consistency: 0,
        score: 0,
      };

      current.quantitySold += Number.isFinite(quantity) ? quantity : 0;
      current.revenue += Number.isFinite(lineTotal) ? lineTotal : 0;

      if (!countedInOrder.has(key)) {
        current.orderCount += 1;
        countedInOrder.add(key);
      }

      if (orderDayToken) {
        current.activeDays.add(orderDayToken);
      }

      summaryByProduct.set(key, current);
    }
  }

  const windowOrderCount = selectedTransactions.length;
  const candidates = Array.from(summaryByProduct.values()).map((item) => {
    const velocity = item.quantitySold / selectedWindowDays;
    const penetration =
      windowOrderCount > 0 ? item.orderCount / windowOrderCount : 0;
    const consistency = item.activeDays.size / selectedWindowDays;

    return {
      ...item,
      velocity,
      penetration,
      consistency,
    };
  });

  const normalize = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);

    return (value: number) => {
      if (!Number.isFinite(value)) {
        return 0;
      }
      if (max === min) {
        return value > 0 ? 1 : 0;
      }
      return (value - min) / (max - min);
    };
  };

  const normalizeVelocity = normalize(candidates.map((item) => item.velocity));
  const normalizePenetration = normalize(
    candidates.map((item) => item.penetration),
  );

  const scoredCandidates = candidates.map((item) => {
    const score =
      0.6 * normalizeVelocity(item.velocity) +
      0.25 * normalizePenetration(item.penetration) +
      0.15 * item.consistency;

    return {
      ...item,
      score,
    };
  });

  const eligibleItems = scoredCandidates.filter(
    (item) => item.quantitySold >= 3 && item.orderCount >= 2,
  );

  const rankedEligibleItems = eligibleItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.quantitySold !== a.quantitySold) {
      return b.quantitySold - a.quantitySold;
    }
    return a.productName.localeCompare(b.productName);
  });

  return {
    selectedWindowDays,
    totalPaidOrdersInWindow: windowOrderCount,
    items: rankedEligibleItems,
  };
}

// Ranks products by recent sales velocity/penetration/consistency to surface
// a "Popular Items" shortlist. Tuned against real sales history (typically
// 20-45 paid orders/day): a 1-day window usually yields fewer than five
// qualifying products, so this widens to a 2-day window whenever a single
// day can't fill the section.
export function computePopularProducts(
  transactions: Transaction[],
  analysisTimeMs: number,
): PopularProductsWindow {
  const paidTransactions = transactions.filter(
    (transaction) => transaction.status === "PAID",
  );

  const oneDay = computeWindow(paidTransactions, analysisTimeMs, 1);
  if (oneDay.items.length >= 5) {
    return oneDay;
  }
  const twoDay = computeWindow(paidTransactions, analysisTimeMs, 2);
  return twoDay.items.length > oneDay.items.length ? twoDay : oneDay;
}
