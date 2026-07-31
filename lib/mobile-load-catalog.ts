export type LoadBrand = "GLOBE" | "TM" | "SMART" | "TNT" | "DITO";

export type LoadNetworkGroup = "GLOBE_TM" | "SMART_TNT" | "DITO";

export type LoadCategory = "Regular Load" | "Data Promo";

export type LoadCatalogItem = {
  id: string;
  sku: string;
  brand: LoadBrand;
  group: LoadNetworkGroup;
  category: LoadCategory;
  code: string;
  amount: number;
  label: string;
  description?: string;
};

export const LOAD_BRANDS: Array<{
  brand: LoadBrand;
  group: LoadNetworkGroup;
  label: string;
}> = [
  { brand: "GLOBE", group: "GLOBE_TM", label: "Globe" },
  { brand: "TM", group: "GLOBE_TM", label: "TM" },
  { brand: "SMART", group: "SMART_TNT", label: "Smart" },
  { brand: "TNT", group: "SMART_TNT", label: "TNT" },
  { brand: "DITO", group: "DITO", label: "DITO" },
];

// Smart's green (#78BE20) and TNT's orange (#E28C39) are pulled from each
// brand's own published style guide. Globe, TM, and DITO don't have a
// publicly indexed one, so these use each network's well-known signature
// color instead (Globe blue, TM's flag-based orange/yellow, DITO red).
export const LOAD_BRAND_COLORS: Record<LoadBrand, string> = {
  GLOBE: "#0033A0",
  TM: "#F8B133",
  SMART: "#78BE20",
  TNT: "#E28C39",
  DITO: "#E4032C",
};

const REGULAR_LOAD_AMOUNTS = [10, 15, 20, 30, 50, 60, 100, 150, 200, 300, 500, 1000];

const REGULAR_LOAD_CATALOG: LoadCatalogItem[] = LOAD_BRANDS.flatMap(
  ({ brand, group }) =>
    REGULAR_LOAD_AMOUNTS.map((amount) => {
      const code = `${brand}${amount}`;
      return {
        id: `load-${brand.toLowerCase()}-${amount}`,
        sku: `LOAD-${code}`,
        brand,
        group,
        category: "Regular Load" as const,
        code,
        amount,
        label: `Regular Load ₱${amount}`,
      };
    }),
);

type DataPromoSeed = {
  code: string;
  amount: number;
  label: string;
  description: string;
};

const GLOBE_TM_DATA_PROMOS: DataPromoSeed[] = [
  {
    code: "GOUNLI50",
    amount: 50,
    label: "GoUNLI50",
    description: "Unli call/text all networks + 500MB · 3 days",
  },
  {
    code: "GOUNLI95",
    amount: 95,
    label: "GoUNLI95",
    description: "Unli call/text all networks + 1GB · 7 days",
  },
  {
    code: "GOUNLI350",
    amount: 350,
    label: "GoUNLI350",
    description: "Unli call/text all networks + 3GB · 30 days",
  },
  {
    code: "GOEXTRA59",
    amount: 59,
    label: "GoExtra59",
    description: "5GB all sites + unli call/text · 3 days",
  },
  {
    code: "GOEXTRA99",
    amount: 99,
    label: "GoExtra99",
    description: "8GB + free 4GB 5G · 7 days",
  },
  {
    code: "SURF4ALL99",
    amount: 99,
    label: "GoSURF (SURF4ALL99)",
    description: "9GB shareable, all sites · 7 days",
  },
  {
    code: "SURF4ALL249",
    amount: 249,
    label: "GoSURF (SURF4ALL249)",
    description: "20GB shareable, all sites · 7 days",
  },
  {
    code: "GOPLUS99",
    amount: 99,
    label: "Go+99",
    description: "20GB + 8GB all-sites · 7 days",
  },
  {
    code: "GOPLUS400",
    amount: 400,
    label: "Go+400",
    description: "48GB + 25GB all-sites · 15 days",
  },
];

const SMART_TNT_DATA_PROMOS: DataPromoSeed[] = [
  {
    code: "ALLDATA50",
    amount: 50,
    label: "All Data 50",
    description: "2GB data for all sites and apps · 3 days",
  },
  {
    code: "ALLDATA99",
    amount: 99,
    label: "All Data 99",
    description: "6GB data for all sites and apps · 7 days",
  },
  {
    code: "ALLDATA299",
    amount: 299,
    label: "All Data 299",
    description: "24GB data for all sites and apps · 30 days",
  },
  {
    code: "MAGICDATA249",
    amount: 249,
    label: "Magic Data 249",
    description: "8GB data for all sites and apps · no expiry",
  },
  {
    code: "MAGICDATA349",
    amount: 349,
    label: "Magic Data 349",
    description: "16GB data for all sites and apps · no expiry",
  },
  {
    code: "POWERALLFB99",
    amount: 99,
    label: "Power All w/ FB 99",
    description: "10GB + unli Facebook/Instagram · 7 days",
  },
  {
    code: "POWERALLTIKTOK99",
    amount: 99,
    label: "Power All w/ TikTok 99",
    description: "10GB + unli TikTok · 7 days",
  },
];

const DITO_DATA_PROMOS: DataPromoSeed[] = [
  {
    code: "LEVELUP99",
    amount: 99,
    label: "Level-Up 99",
    description: "7GB + unli allnet text + DITO-to-DITO calls · 30 days",
  },
  {
    code: "LEVELUPSOCIALS299",
    amount: 299,
    label: "Level-Up Socials 299",
    description: "5GB + unli FB/IG/TikTok/WhatsApp · 30 days",
  },
  {
    code: "LEVELUPYOUTUBE199",
    amount: 199,
    label: "Level-Up YouTube 199",
    description: "22GB YouTube + 4GB general · 30 days",
  },
  {
    code: "NEWLEVELUP499",
    amount: 499,
    label: "New Level-Up 499",
    description: "55GB + 8GB bonus data · 30 days",
  },
  {
    code: "LONGEXPIRY599",
    amount: 599,
    label: "Long Expiry 599",
    description: "40GB · 365 days",
  },
];

function buildDataPromoCatalog(
  group: LoadNetworkGroup,
  seeds: DataPromoSeed[],
): LoadCatalogItem[] {
  const brandsInGroup = LOAD_BRANDS.filter((entry) => entry.group === group);

  return brandsInGroup.flatMap(({ brand }) =>
    seeds.map((seed) => ({
      id: `promo-${brand.toLowerCase()}-${seed.code.toLowerCase()}`,
      sku: `PROMO-${seed.code}`,
      brand,
      group,
      category: "Data Promo" as const,
      code: seed.code,
      amount: seed.amount,
      label: seed.label,
      description: seed.description,
    })),
  );
}

const DATA_PROMO_CATALOG: LoadCatalogItem[] = [
  ...buildDataPromoCatalog("GLOBE_TM", GLOBE_TM_DATA_PROMOS),
  ...buildDataPromoCatalog("SMART_TNT", SMART_TNT_DATA_PROMOS),
  ...buildDataPromoCatalog("DITO", DITO_DATA_PROMOS),
];

export const LOAD_CATALOG: LoadCatalogItem[] = [
  ...REGULAR_LOAD_CATALOG,
  ...DATA_PROMO_CATALOG,
];

export function findLoadCatalogItem(id: string) {
  return LOAD_CATALOG.find((item) => item.id === id) ?? null;
}
