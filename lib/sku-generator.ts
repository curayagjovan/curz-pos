/**
 * Smart SKU Generator using product abbreviation + date added + price
 * Format: ABB-DATE-PRICE
 * Example: CCB-20260703-2450
 */

interface ParsedProduct {
  category: string;
  brand: string;
  variant: string;
  size: string;
}

const CATEGORY_PATTERNS: Record<string, string> = {
  // Home & Household
  "TRASH|BIN|BUCKET": "HOM",
  "BROOM|BRUSH|DUSTPAN|DUSTER": "HOM",
  "MOP|CLOTH|SPONGE": "HOM",
  "BLEACH|CLEANER|DETERGENT": "HOM",
  "SOAP|DISHWASH|LIQUID": "HOM",

  // Food & Snacks
  "CHIPS|CRACKERS|PRETZELS": "FDS",
  "CANDY|GUMMY|LOLLIPOP|MINT": "FDS",
  "WAFER|BISCUIT|COOKIE": "FDS",

  // Food & Beverages
  "COFFEE|NESCAFE|KOPIKO": "FDB",
  "TEA|TANG|JUICE": "FDB",
  "MILK|CREAMER|POWDER": "FDB",

  // Food & Canned
  "SARDINES|TUNA|CORNED": "FDC",
  "LOAF|PÂTÉ": "FDC",

  // Food & Condiments/Dry Goods
  "OIL|VINEGAR|SAUCE|SUGAR|SALT": "FDO",
  "NOODLES|INSTANT|MAMI|PANCIT": "FDO",
  "SEASONINGS|MAGIC|POWDER": "FDO",

  // Personal Care - Oral
  "TOOTHPASTE|COLGATE|CLOSE": "PCC",

  // Personal Care - Hair
  "SHAMPOO|CONDITIONER|CREAM SILK|SUNSILK|HEAD": "PCH",

  // Personal Care - Soap & Bath
  "SOAP|SILKA|PALMOLIVE|BODY": "PCS",

  // Stationery
  "PAPER|PENCIL|PEN|FOLDER|PAD|NOTEBOOK": "STA",
};

const BRAND_REPLACEMENTS: Record<string, string> = {
  CLOVER: "CLV",
  OISHI: "OIS",
  "MANG JUAN": "MJN",
  "555": "555",
  ARIEL: "ARL",
  COLGATE: "CGT",
  NESCAFE: "NES",
  ZONROX: "ZNX",
  SILKA: "SLK",
  "HEAD SHOULDER": "HED",
  "CREAM SILK": "CMS",
  ANGEL: "ANG",
  "GREAT TASTE": "GRT",
  PEPSI: "PEP",
  "MOUNTAIN DEW": "MTN",
  "LUCKY ME": "LME",
  SUNSILK: "SUN",
  PALMOLIVE: "PAL",
  BIODERM: "BIO",
  "BIRCH TREE": "BRC",
  REBISCO: "REB",
  NISSIN: "NIS",
  SKYFLAKES: "SKY",
  PRESTO: "PRE",
  SURF: "SRF",
  WINGS: "WNG",
  JOY: "JOY",
  DOWNY: "DWN",
  GLAD: "GLD",
};

const VARIANT_KEYWORDS: Record<string, string> = {
  // Colors
  "BLACK|BLK": "BLK",
  "WHITE|WHT": "WHT",
  "GREEN|GRN": "GRN",
  "BLUE|BLU": "BLU",
  "RED|RD": "RED",
  "YELLOW|YEL": "YEL",

  // Flavors
  "CHEESE|CHSE": "CHZ",
  "CHOCOLATE|CHOCO": "CHO",
  "VANILLA|VAN": "VAN",
  "MINT|MNTHL": "MNT",
  "LEMON|LEM": "LEM",
  "ORANGE|ORG": "ORA",
  "CHILI|SILI|SPICY|HOT": "SPI",
  "ORIGINAL|ORG": "ORI",
  PEPPERMINT: "PEP",
  "PAPAYA|PAP": "PAP",
  "FLORAL|FLO": "FLO",
  "CARAMEL|CAR": "CAR",
  "BBQ|BARBECUE": "BBQ",
  "HONEY|HON": "HON",

  // Types/Variants
  "ULTIMATE|ULTMTE": "ULT",
  "REBORN|RBN": "RBN",
  "CONCENTRATE|CMP": "CMP",
  "LIQUID|LQD": "LQD",
  "POWDER|PWD": "PWD",
  BAR: "BAR",
  "JUMBO|JMBO": "JMB",
  "MEDIUM|MED": "MED",
  "SMALL|SML": "SML",
  "BIG|LARGE": "LRG",
  "REGULAR|REG": "REG",
  GOLD: "GLD",
  STANDARD: "STD",
  COOL: "COL",
  "FRESH|FRES": "FRS",
};

const SIZE_PATTERNS = [
  /(\d+)(?:g|G)(?:\s|$)/, // 24G → 24
  /(\d+)(?:ml|ML)(?:\s|$)/, // 320ML → 320
  /(\d+)(?:l|L)(?:\s|$)/, // 1L → 1L
  /(\d+)\/(\d+)/, // 100/155 → 155
  /(?:jumbo|jmbo)/i, // JUMBO → JMB
  /(?:mini|small)/i, // MINI → SMI
  /(?:big|large)/i, // BIG → BIG
  /(\d+)s(?:\s|$)/i, // 12S → 12
];

function extractCategory(productName: string): string {
  const upper = productName.toUpperCase();

  for (const [pattern, code] of Object.entries(CATEGORY_PATTERNS)) {
    if (new RegExp(pattern).test(upper)) {
      return code;
    }
  }

  return "OTH"; // Other
}

function extractBrand(productName: string): string {
  const upper = productName.toUpperCase().trim();

  // Try exact brand matches first
  for (const [brand, code] of Object.entries(BRAND_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${brand}\\b`);
    if (regex.test(upper)) {
      return code;
    }
  }

  // Fallback: Use first 3 significant words/numbers
  const words = upper
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(IN|OF|BY|AND|WITH|THE|FOR)$/.test(w));

  if (words.length === 0) {
    return "XXX";
  }

  // Prefer numeric brands (e.g., 555, 907)
  const numericWord = words.find((w) => /^\d+/.test(w));
  if (numericWord) {
    return numericWord.substring(0, 3);
  }

  // Otherwise use first word
  return words[0].substring(0, 3);
}

function extractVariant(productName: string): string {
  const upper = productName.toUpperCase();

  for (const [keywords, code] of Object.entries(VARIANT_KEYWORDS)) {
    if (new RegExp(keywords).test(upper)) {
      return code;
    }
  }

  return "STD"; // Standard
}

function extractSize(productName: string, unit?: string): string {
  const upper = productName.toUpperCase();

  // Check product name for size markers
  for (const pattern of SIZE_PATTERNS) {
    const match = upper.match(pattern);
    if (match) {
      if (match[2]) {
        // For patterns like "100/155", return second number
        return match[2].substring(0, 3).padStart(2, "0");
      }

      if (!match[1]) {
        if (/(?:jumbo|jmbo)/i.test(upper)) return "JMB";
        if (/(?:mini|small)/i.test(upper)) return "SMI";
        if (/(?:big|large)/i.test(upper)) return "BIG";
        continue;
      }

      // Return first capture group
      const size = match[1].substring(0, 3);
      return size.padStart(2, "0");
    }
  }

  // Special handling for special units
  if (unit) {
    const unitUpper = unit.toUpperCase();
    if (unitUpper.includes("PACK")) return "PCK";
    if (unitUpper.includes("PCS")) return "PCS";
    if (unitUpper.includes("BOX")) return "BOX";
    if (unitUpper.includes("JAR")) return "JAR";
    if (unitUpper.includes("CAN")) return "CAN";
    if (unitUpper.includes("BOT")) return "BOT";
    if (unitUpper.includes("BAG")) return "BAG";
  }

  return "001"; // Default
}

export function parseProductForSku(
  productName: string,
  unit?: string,
): ParsedProduct {
  return {
    category: extractCategory(productName),
    brand: extractBrand(productName),
    variant: extractVariant(productName),
    size: extractSize(productName, unit),
  };
}

/**
 * Generate a smart SKU from product details
 * Format: CAT-BRD-VAR-SZ
 */
function toProductAbbreviation(productName: string): string {
  const normalizedWords = productName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !/^(THE|AND|OF|WITH|FOR|IN|ON|BY|TO|A|AN)$/.test(word));

  if (normalizedWords.length === 0) {
    return "ITEM";
  }

  if (normalizedWords.length === 1) {
    return normalizedWords[0].slice(0, 3).padEnd(3, "X");
  }

  const initials = normalizedWords.map((word) => word[0]).join("");
  return initials.slice(0, 3).padEnd(3, "X");
}

function toDateAddedToken(dateAdded?: Date | string | null): string {
  const resolved = dateAdded ? new Date(dateAdded) : new Date();
  if (Number.isNaN(resolved.getTime())) {
    const fallback = new Date();
    const fallbackParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(fallback);
    const year = fallbackParts.find((part) => part.type === "year")?.value;
    const month = fallbackParts.find((part) => part.type === "month")?.value;
    const day = fallbackParts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
      return "19700101";
    }

    return `${year}${month}${day}`;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(resolved);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "19700101";
  }

  return `${year}${month}${day}`;
}

function toPriceToken(price?: number | string | null): string {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return "000";
  }

  // Store price with 2 decimal precision but without punctuation.
  return numericPrice.toFixed(2).replace(".", "");
}

export function generateSmartSku(
  productName: string,
  price?: number | string | null,
  dateAdded?: Date | string | null,
): string {
  const abbr = toProductAbbreviation(productName);
  const dateToken = toDateAddedToken(dateAdded);
  const priceToken = toPriceToken(price);
  return `${abbr}-${dateToken}-${priceToken}`;
}

/**
 * Generate a sequential fallback SKU
 * Used when smart generation is disabled or preferred
 */
export async function generateSequentialSku(
  prismaInstance: {
    product: {
      findMany: (args: {
        where: { sku: { startsWith: string } };
        select: { sku: true };
        orderBy: { sku: "desc" };
        take: number;
      }) => Promise<Array<{ sku: string }>>;
    };
  },
  basePrefix: string = "SKU",
): Promise<string> {
  const base =
    basePrefix
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 6) || "SKU";

  const existing = await prismaInstance.product.findMany({
    where: { sku: { startsWith: `${base}-` } },
    select: { sku: true },
    orderBy: { sku: "desc" },
    take: 1,
  });

  let nextNumber = 1;
  if (existing.length > 0) {
    const lastSku = existing[0].sku;
    const match = lastSku.match(new RegExp(`^${base}-(\\d+)$`));
    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `${base}-${String(nextNumber).padStart(6, "0")}`;
}
