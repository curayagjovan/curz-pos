export type EWalletProvider = "GCASH" | "MAYA";

export type EWalletDirection = "CASH_IN" | "CASH_OUT";

export type EWalletCatalogEntry = {
  id: string;
  provider: EWalletProvider;
  direction: EWalletDirection;
  label: string;
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
