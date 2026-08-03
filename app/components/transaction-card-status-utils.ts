import type { Transaction } from "@/types/transaction";

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
