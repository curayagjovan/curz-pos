export type BundleTierInput = {
  quantity: number;
  price: number;
};

// Coerces/sorts raw bundle tier data (from the API, a form, or IndexedDB
// cache) into a clean ascending-by-quantity list, dropping anything that
// can't be a real tier. Shared by display code and form validation so both
// agree on what counts as "a valid tier."
export function normalizeBundleTiers(
  raw: unknown,
): BundleTierInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<number>();
  const tiers: BundleTierInput[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const quantity = Number((entry as { quantity?: unknown }).quantity);
    const price = Number((entry as { price?: unknown }).price);

    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 2 ||
      !Number.isFinite(price) ||
      price < 0 ||
      seen.has(quantity)
    ) {
      continue;
    }

    seen.add(quantity);
    tiers.push({ quantity, price });
  }

  return tiers.sort((left, right) => left.quantity - right.quantity);
}

// Validates a bundleTiers request payload before it's persisted. Unlike
// normalizeBundleTiers (which silently drops bad entries for display),
// this rejects the whole payload on any invalid entry — a typo'd tier
// should surface as a 400, not silently vanish.
export function parseBundleTiersInput(
  raw: unknown,
): { ok: true; tiers: BundleTierInput[] } | { ok: false } {
  if (raw === undefined || raw === null) {
    return { ok: true, tiers: [] };
  }

  if (!Array.isArray(raw)) {
    return { ok: false };
  }

  const tiers: BundleTierInput[] = [];
  const seenQuantities = new Set<number>();

  for (const entry of raw) {
    const quantity = Number((entry as { quantity?: unknown })?.quantity);
    const price = Number((entry as { price?: unknown })?.price);

    if (
      !Number.isInteger(quantity) ||
      quantity < 2 ||
      !Number.isFinite(price) ||
      price < 0 ||
      seenQuantities.has(quantity)
    ) {
      return { ok: false };
    }

    seenQuantities.add(quantity);
    tiers.push({ quantity, price });
  }

  return { ok: true, tiers: normalizeBundleTiers(tiers) };
}

// Cheapest way to price `quantity` units of a product, given its regular
// unit price and any bundle tiers. A single tier can be handled by greedy
// division, but with several tiers the greedy choice isn't always optimal
// (e.g. tiers of 3-for-100 and 6-for-180: qty 9 must combine 6+3 = 280, not
// three 3-packs = 300) — so this fills a dynamic-programming table of the
// cheapest cost for every quantity from 0 up to the requested amount.
export function computeLineTotal(
  quantity: number,
  unitPrice: number,
  tiers: BundleTierInput[],
): number {
  const validTiers = tiers.filter(
    (tier) =>
      Number.isInteger(tier.quantity) &&
      tier.quantity >= 2 &&
      Number.isFinite(tier.price) &&
      tier.price >= 0,
  );

  if (validTiers.length === 0 || quantity <= 0) {
    return Number((quantity * unitPrice).toFixed(2));
  }

  const cheapestCostByQuantity = new Array<number>(quantity + 1).fill(0);

  for (let q = 1; q <= quantity; q += 1) {
    let best = cheapestCostByQuantity[q - 1] + unitPrice;

    for (const tier of validTiers) {
      if (tier.quantity <= q) {
        const candidate = cheapestCostByQuantity[q - tier.quantity] + tier.price;
        if (candidate < best) {
          best = candidate;
        }
      }
    }

    cheapestCostByQuantity[q] = best;
  }

  return Number(cheapestCostByQuantity[quantity].toFixed(2));
}
