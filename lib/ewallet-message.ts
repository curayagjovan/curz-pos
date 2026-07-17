import type { EWalletDirection } from "@/lib/ewallet-catalog";

export function buildEwalletMessage(
  providerLabel: string,
  direction: EWalletDirection,
  amount: number,
  accountNumber?: string,
) {
  return direction === "CASH_IN"
    ? `${providerLabel} Cash In ₱${amount.toFixed(2)} to ${accountNumber}`
    : `${providerLabel} Cash Out ₱${amount.toFixed(2)}`;
}
