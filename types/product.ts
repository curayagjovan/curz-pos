import type { ProductCategoryValue } from "@/lib/product-categories";

export type Product = {
  id: string;
  sku: string;
  name: string;
  unit?: string | null;
  category: ProductCategoryValue;
  description?: string | null;
  price: number | string;
  bundleQty?: number | string | null;
  bundlePrice?: number | string | null;
};
