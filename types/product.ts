export type Product = {
  id: string;
  sku: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  price: number | string;
  bundleQty?: number | string | null;
  bundlePrice?: number | string | null;
};
