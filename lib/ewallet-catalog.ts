export type EWalletProvider = "GCASH" | "MAYA";

export type EWalletDirection = "CASH_IN" | "CASH_OUT";

// How a cash-in transaction is identified: by the recipient's mobile number,
// or by the app reference number when the transfer was done via QR scan
// (the GCash/Maya app masks the mobile number in that case).
export type EWalletIdMode = "mobile" | "reference";

export type EWalletCatalogEntry = {
  id: string;
  provider: EWalletProvider;
  direction: EWalletDirection;
  label: string;
};

// Hex values read directly from each provider's official logo artwork
// (GCash blue, Maya mint green) — the same sourcing approach used for the
// load brands.
export const EWALLET_PROVIDER_COLORS: Record<EWalletProvider, string> = {
  GCASH: "#007CFF",
  MAYA: "#75EEA5",
};

export const EWALLET_PROVIDER_LOGOS: Record<EWalletProvider, string> = {
  GCASH: "/ewallet-brands/gcash.svg",
  MAYA: "/ewallet-brands/maya.svg",
};

export const EWALLET_PROVIDERS: Array<{
  provider: EWalletProvider;
  label: string;
}> = [
  { provider: "GCASH", label: "GCash" },
  { provider: "MAYA", label: "Maya" },
];

export const EWALLET_DIRECTIONS: Array<{
  direction: EWalletDirection;
  label: string;
}> = [
  { direction: "CASH_IN", label: "Cash In" },
  { direction: "CASH_OUT", label: "Cash Out" },
];

function entryId(provider: EWalletProvider, direction: EWalletDirection) {
  return `ewallet-${provider.toLowerCase()}-${direction === "CASH_IN" ? "cashin" : "cashout"}`;
}

export const EWALLET_CATALOG: EWalletCatalogEntry[] = EWALLET_PROVIDERS.flatMap(
  ({ provider, label: providerLabel }) =>
    EWALLET_DIRECTIONS.map(({ direction, label: directionLabel }) => ({
      id: entryId(provider, direction),
      provider,
      direction,
      label: `${providerLabel} ${directionLabel}`,
    })),
);

export function findEwalletCatalogEntry(
  provider: EWalletProvider,
  direction: EWalletDirection,
) {
  return (
    EWALLET_CATALOG.find(
      (entry) => entry.provider === provider && entry.direction === direction,
    ) ?? null
  );
}
