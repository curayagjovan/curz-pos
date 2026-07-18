import type { EWalletDirection } from "@/lib/ewallet-catalog";

// QR transactions scanned straight from the GCash/Maya app only expose a
// reference number (the counterparty's mobile number is masked), so the
// identifier is either a mobile number or a reference number.
export function buildEwalletMessage(
  providerLabel: string,
  direction: EWalletDirection,
  amount: number,
  identifier?: { accountNumber?: string; referenceNumber?: string },
) {
  const base =
    direction === "CASH_IN"
      ? `${providerLabel} Cash In ₱${amount.toFixed(2)}`
      : `${providerLabel} Cash Out ₱${amount.toFixed(2)}`;

  const accountNumber = identifier?.accountNumber?.trim();
  const referenceNumber = identifier?.referenceNumber?.trim();

  if (direction === "CASH_IN" && accountNumber) {
    return `${base} to ${accountNumber}`;
  }
  if (referenceNumber) {
    return `${base} (Ref ${referenceNumber})`;
  }
  return base;
}
