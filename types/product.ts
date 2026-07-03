export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  bundleQty?: number | string | null;
  bundlePrice?: number | string | null;
  stock: number | string;
};
