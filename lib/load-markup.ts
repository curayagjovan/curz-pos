export type LoadMarkupSettings = {
  tier1Max: number;
  tier1Markup: number;
  tier2Max: number;
  tier2Markup: number;
  tier3Markup: number;
};

export const DEFAULT_LOAD_MARKUP_SETTINGS: LoadMarkupSettings = {
  tier1Max: 50,
  tier1Markup: 3,
  tier2Max: 98,
  tier2Markup: 5,
  tier3Markup: 10,
};

export function getMarkupForAmount(
  amount: number,
  settings: LoadMarkupSettings,
): number {
  if (amount <= settings.tier1Max) {
    return settings.tier1Markup;
  }
  if (amount <= settings.tier2Max) {
    return settings.tier2Markup;
  }
  return settings.tier3Markup;
}

export function getSellPrice(
  amount: number,
  settings: LoadMarkupSettings,
): number {
  return amount + getMarkupForAmount(amount, settings);
}
