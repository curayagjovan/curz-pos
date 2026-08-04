import type { SaleCategory, Transaction } from "@/types/transaction";

export const ALL_STATUSES: Transaction["status"][] = [
  "PENDING",
  "PAID",
  "REFUNDED",
  "VOIDED",
];

export function getStatusColor(status: Transaction["status"]) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "PENDING":
      return "info" as const;
    case "REFUNDED":
      return "warning" as const;
    case "VOIDED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

export function formatTransactionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// Load and e-wallet sales are checked out through Product rows seeded with
// unit "load"/"ewallet" (see prisma/seed-mobile-loads.ts,
// prisma/seed-ewallet-items.ts) rather than a dedicated table, and each such
// order only ever contains a single item — so the first item's product unit
// is enough to classify the whole sale.
export function getSaleCategory(transaction: Transaction): SaleCategory {
  const unit = transaction.items[0]?.product?.unit;
  return unit === "load" || unit === "ewallet" ? "load_ewallet" : "product";
}

export function getCashierLabel(cashier: Transaction["cashier"]) {
  if (!cashier) {
    return null;
  }

  return cashier.displayName?.trim() || cashier.email;
}

export function getStatusConfirmationMessage(status: Transaction["status"]) {
  switch (status) {
    case "REFUNDED":
      return "Mark this sale as REFUNDED?";
    case "VOIDED":
      return "Mark this sale as VOIDED?";
    default:
      return null;
  }
}
