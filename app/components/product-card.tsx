"use client";

import { memo } from "react";
import type { Product } from "@/types/product";
import ProductCardCatalog from "@/app/components/product-card-catalog";
import ProductCardInventory from "@/app/components/product-card-inventory";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void;
  onRequestDelete?: (product: Product) => void;
  deleteDisabled?: boolean;
  variant?: "catalog" | "inventory";
};

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  onRequestDelete,
  deleteDisabled = false,
  variant = "catalog",
}: ProductCardProps) {
  if (variant === "inventory") {
    return (
      <ProductCardInventory
        product={product}
        onAddToCart={onAddToCart}
        onRequestDelete={onRequestDelete}
        deleteDisabled={deleteDisabled}
      />
    );
  }

  return <ProductCardCatalog product={product} onAddToCart={onAddToCart} />;
});

export default ProductCard;
