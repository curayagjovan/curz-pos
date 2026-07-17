export type EWalletFeeSettings = {
  tier1Max: number;
  tier1Fee: number;
  tier2Max: number;
  tier2Fee: number;
  tier3Fee: number;
};

export const DEFAULT_EWALLET_FEE_SETTINGS: EWalletFeeSettings = {
  tier1Max: 100,
  tier1Fee: 5,
  tier2Max: 500,
  tier2Fee: 10,
  tier3Fee: 20,
};

export function getFeeForAmount(
  amount: number,
  settings: EWalletFeeSettings,
): number {
  if (amount <= settings.tier1Max) {
    return settings.tier1Fee;
  }
  if (amount <= settings.tier2Max) {
    return settings.tier2Fee;
  }
  return settings.tier3Fee;
}

export function getCashInTotal(
  amount: number,
  settings: EWalletFeeSettings,
): number {
  return amount + getFeeForAmount(amount, settings);
}
