/**
 * Calculate selling price from cost with markup
 * Rounds to nearest whole peso using standard rounding (0.5+ rounds up)
 * Examples: 1.40→1, 1.50→2, 1.60→2, 1.80→2, 1.20→1, 1.30→1
 */
export function calculateSellingPrice(
  cost: number,
  markupPercent: number,
): number {
  if (
    Number.isNaN(cost) ||
    Number.isNaN(markupPercent) ||
    cost < 0 ||
    markupPercent < 0
  ) {
    return 0;
  }

  const priceWithMarkup = cost * (1 + markupPercent / 100);
  return Math.round(priceWithMarkup);
}

/**
 * Round a price to nearest whole peso
 */
export function roundToNearestPeso(price: number): number {
  if (Number.isNaN(price)) {
    return 0;
  }

  return Math.round(price);
}
