// Fee schedule follows the printed GCash cash-in/cash-out chart: fixed fees
// for the starter brackets, then a flat step fee for every ₱500 bracket above
// ₱1,500 (₱1,501–2,000 → 3 steps, ₱2,001–2,500 → 4 steps, and so on).
export type EWalletFeeSettings = {
  tier1Fee: number; // ₱1 – ₱100
  tier2Fee: number; // ₱101 – ₱500
  tier3Fee: number; // ₱501 – ₱1,000
  tier4Fee: number; // ₱1,001 – ₱1,500
  stepFee: number; // per ₱500 bracket above ₱1,500
};

export const DEFAULT_EWALLET_FEE_SETTINGS: EWalletFeeSettings = {
  tier1Fee: 5,
  tier2Fee: 10,
  tier3Fee: 15,
  tier4Fee: 20,
  stepFee: 10,
};

export function getFeeForAmount(
  amount: number,
  settings: EWalletFeeSettings,
): number {
  if (amount <= 0) {
    return 0;
  }
  if (amount <= 100) {
    return settings.tier1Fee;
  }
  if (amount <= 500) {
    return settings.tier2Fee;
  }
  if (amount <= 1000) {
    return settings.tier3Fee;
  }
  if (amount <= 1500) {
    return settings.tier4Fee;
  }

  return (Math.ceil(amount / 500) - 1) * settings.stepFee;
}

export function getCashInTotal(
  amount: number,
  settings: EWalletFeeSettings,
): number {
  return amount + getFeeForAmount(amount, settings);
}
