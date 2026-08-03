import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/currency";

export function getBundleMeta(product: Product) {
  const bundleQty =
    product.bundleQty == null ? null : Number(product.bundleQty);
  const bundlePrice =
    product.bundlePrice == null ? null : Number(product.bundlePrice);

  const hasBundle =
    bundleQty != null &&
    Number.isFinite(bundleQty) &&
    bundleQty > 0 &&
    bundlePrice != null &&
    Number.isFinite(bundlePrice);

  return {
    hasBundle,
    label: hasBundle
      ? `Bundle ${bundleQty} for ${formatCurrency(bundlePrice)}`
      : "",
  };
}
