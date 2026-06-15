/**
 * Unit normalization and lookup for inventory management.
 * Maps all unit variants to standardized base units with conversion rules.
 */

export const STANDARD_UNITS = [
  "PCS", // Pieces (base unit for most items)
  "PACK", // Packs
  "BOX", // Boxes
  "CASE", // Cases
  "CAN", // Canned goods
  "BOT", // Bottles
  "BAG", // Bags
  "JAR", // Jars
  "ROLL", // Rolls (paper, etc)
  "REAM", // Reams (500 sheets)
  "PAD", // Pads/notepads
  "TIE", // Tied bundles
  "CUP", // Cup servings
] as const;

export type StandardUnit = (typeof STANDARD_UNITS)[number];

/**
 * Unit normalization rules: maps non-standard units to standard units + conversion factor.
 * Format: { originalUnit: { normalizedUnit, piecesPerUnit, description } }
 */
export const UNIT_NORMALIZATION_MAP: Record<
  string,
  {
    normalizedUnit: StandardUnit;
    piecesPerUnit: number;
    description: string;
  }
> = {
  // Already standard
  PCS: {
    normalizedUnit: "PCS",
    piecesPerUnit: 1,
    description: "Pieces (base unit)",
  },
  PACK: {
    normalizedUnit: "PACK",
    piecesPerUnit: 1,
    description: "Pack",
  },
  BOX: {
    normalizedUnit: "BOX",
    piecesPerUnit: 1,
    description: "Box",
  },
  CASE: {
    normalizedUnit: "CASE",
    piecesPerUnit: 1,
    description: "Case",
  },
  CAN: { normalizedUnit: "CAN", piecesPerUnit: 1, description: "Canned goods" },
  BOT: { normalizedUnit: "BOT", piecesPerUnit: 1, description: "Bottles" },
  BAG: { normalizedUnit: "BAG", piecesPerUnit: 1, description: "Bags" },
  JAR: { normalizedUnit: "JAR", piecesPerUnit: 1, description: "Jars" },
  ROLL: { normalizedUnit: "ROLL", piecesPerUnit: 1, description: "Rolls" },
  REAM: {
    normalizedUnit: "REAM",
    piecesPerUnit: 500,
    description: "Ream (500 sheets)",
  },
  PAD: {
    normalizedUnit: "PAD",
    piecesPerUnit: 1,
    description: "Pads/notepads",
  },
  TIE: { normalizedUnit: "TIE", piecesPerUnit: 1, description: "Tied bundles" },
  CUP: { normalizedUnit: "CUP", piecesPerUnit: 1, description: "Cup servings" },

  // Normalize multipack variants to PACK
  "2'S": { normalizedUnit: "PACK", piecesPerUnit: 2, description: "Pack of 2" },
  "3'S": { normalizedUnit: "PACK", piecesPerUnit: 3, description: "Pack of 3" },
  "25'S": {
    normalizedUnit: "PACK",
    piecesPerUnit: 25,
    description: "Pack of 25",
  },
  PCK10: {
    normalizedUnit: "PACK",
    piecesPerUnit: 10,
    description: "Pack of 10",
  },
  PCK16: {
    normalizedUnit: "PACK",
    piecesPerUnit: 16,
    description: "Pack of 16",
  },

  // Normalize box variants to BOX
  BX10: { normalizedUnit: "BOX", piecesPerUnit: 10, description: "Box of 10" },
  LBOX: {
    normalizedUnit: "BOX",
    piecesPerUnit: 1,
    description: "Large box (pieces/box unknown)",
  },

  // Normalize case variants to CASE
  CS12: {
    normalizedUnit: "CASE",
    piecesPerUnit: 12,
    description: "Case of 12",
  },

  // Normalize bar to pieces
  BAR: {
    normalizedUnit: "PCS",
    piecesPerUnit: 1,
    description: "Bar (treat as individual piece)",
  },

  // Normalize bag variants to BAG
  BG8: { normalizedUnit: "BAG", piecesPerUnit: 8, description: "Bag of 8" },

  // Ambiguous units that need manual review
  L3: {
    normalizedUnit: "PACK",
    piecesPerUnit: 3,
    description: "Ambiguous: L3 (assumed lot of 3)",
  },
  S: {
    normalizedUnit: "PCS",
    piecesPerUnit: 1,
    description: "Ambiguous: S (assumed single/small)",
  },
};

/**
 * Get the normalized unit and conversion factor for a given unit string.
 * If unit is not found, defaults to PCS with factor 1.
 */
export function normalizeUnit(rawUnit: string | undefined | null): {
  unit: StandardUnit;
  piecesPerUnit: number;
  description: string;
} {
  if (!rawUnit) {
    return {
      unit: "PCS",
      piecesPerUnit: 1,
      description: "Pieces (default)",
    };
  }

  const trimmed = rawUnit.trim().toUpperCase();
  const rule = UNIT_NORMALIZATION_MAP[trimmed];

  if (rule) {
    return {
      unit: rule.normalizedUnit,
      piecesPerUnit: rule.piecesPerUnit,
      description: rule.description,
    };
  }

  // Unknown unit: default to the raw unit if it matches standard, else PCS
  if (STANDARD_UNITS.includes(trimmed as StandardUnit)) {
    return {
      unit: trimmed as StandardUnit,
      piecesPerUnit: 1,
      description: "Normalized",
    };
  }

  console.warn(
    `[Unit Normalization] Unknown unit '${rawUnit}', defaulting to PCS`,
  );
  return {
    unit: "PCS",
    piecesPerUnit: 1,
    description: "Default (unknown unit)",
  };
}

/**
 * Unit display labels for UI dropdowns
 */
export const UNIT_LABELS: Record<StandardUnit, string> = {
  PCS: "Pieces",
  PACK: "Pack",
  BOX: "Box",
  CASE: "Case",
  CAN: "Can",
  BOT: "Bottle",
  BAG: "Bag",
  JAR: "Jar",
  ROLL: "Roll",
  REAM: "Ream",
  PAD: "Pad",
  TIE: "Tie/Bundle",
  CUP: "Cup",
};
