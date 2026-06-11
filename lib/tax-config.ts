const TAX_ENABLED_RAW = process.env.NEXT_PUBLIC_POS_TAX_ENABLED;
const TAX_RATE_RAW = process.env.NEXT_PUBLIC_POS_TAX_RATE;

export const TAX_ENABLED = TAX_ENABLED_RAW === "true";

const parsedRate = Number(TAX_RATE_RAW ?? 0.12);
export const TAX_RATE =
  Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 0.12;

export function computeTax(subtotal: number) {
  if (!TAX_ENABLED) {
    return 0;
  }

  return Number((subtotal * TAX_RATE).toFixed(2));
}
