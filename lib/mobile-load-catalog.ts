export type LoadBrand = "GLOBE" | "TM" | "SMART" | "TNT" | "DITO";

export type LoadNetworkGroup = "GLOBE_TM" | "SMART_TNT" | "DITO";

export type LoadCatalogItem = {
  id: string;
  sku: string;
  brand: LoadBrand;
  group: LoadNetworkGroup;
  code: string;
  amount: number;
  label: string;
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

const REGULAR_LOAD_AMOUNTS = [10, 15, 20, 30, 50, 60, 100, 150, 200, 300, 500, 1000];

export const LOAD_CATALOG: LoadCatalogItem[] = LOAD_BRANDS.flatMap(
  ({ brand, group }) =>
    REGULAR_LOAD_AMOUNTS.map((amount) => {
      const code = `${brand}${amount}`;
      return {
        id: `load-${brand.toLowerCase()}-${amount}`,
        sku: `LOAD-${code}`,
        brand,
        group,
        code,
        amount,
        label: `Regular Load ₱${amount}`,
      };
    }),
);

export function findLoadCatalogItem(id: string) {
  return LOAD_CATALOG.find((item) => item.id === id) ?? null;
}
