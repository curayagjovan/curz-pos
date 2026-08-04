import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/currency";
import { normalizeBundleTiers } from "@/lib/bundle-pricing";

export function getBundleMeta(product: Product) {
  const tiers = normalizeBundleTiers(
    product.bundleTiers?.map((tier) => ({
      quantity: tier.quantity,
      price: Number(tier.price),
    })),
  );

  const hasBundle = tiers.length > 0;

  return {
    hasBundle,
    tiers,
    label: hasBundle
      ? `Bundle: ${tiers
          .map((tier) => `${tier.quantity} for ${formatCurrency(tier.price)}`)
          .join(" · ")}`
      : "",
  };
}
