// Single source of truth for peso display formatting — always includes
// thousands separators and exactly 2 decimal places, so a ₱1,500 total
// never looks different (e.g. "₱1500.00") depending on which screen
// happens to render it.
export function formatCurrency(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "--";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "--";
  }

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
