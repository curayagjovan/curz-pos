"use client";

import { memo } from "react";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import FadeInContent from "@/app/components/fade-in-content";
import ListEmptyState from "@/app/components/list-empty-state";
import ListSkeleton from "@/app/components/list-skeleton";
import ProductCard from "@/app/components/product-card";
import VirtualizedProductList from "@/app/components/virtualized-product-list";
import type { Product } from "@/types/product";

// Below this count, a plain mapped <List> is cheap enough that windowing
// would only add overhead (measurement, absolute positioning). Above it —
// large catalogs, hundreds of SKUs — virtualization keeps scroll smooth by
// only mounting the rows actually on screen.
const VIRTUALIZE_THRESHOLD = 30;

type ProductsCatalogProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void;
  onQuickAddBundle?: (product: Product, quantity: number) => void;
  onRequestDelete?: (product: Product) => void;
  onTogglePin?: (product: Product) => void;
  deletingProductId?: string | null;
  variant?: "catalog" | "inventory";
};

const ProductsCatalog = memo(function ProductsCatalog({
  products,
  loading,
  error,
  onAddToCart,
  onQuickAddBundle,
  onRequestDelete,
  onTogglePin,
  deletingProductId = null,
  variant = "catalog",
}: ProductsCatalogProps) {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return <ListSkeleton />;
  }

  if (products.length === 0) {
    return (
      <ListEmptyState
        description="No products found."
        icon={<Inventory2Rounded fontSize="small" />}
      />
    );
  }

  if (products.length > VIRTUALIZE_THRESHOLD) {
    return (
      <FadeInContent>
        <VirtualizedProductList
          products={products}
          onAddToCart={onAddToCart}
          onQuickAddBundle={onQuickAddBundle}
          onRequestDelete={onRequestDelete}
          onTogglePin={onTogglePin}
          deletingProductId={deletingProductId}
          variant={variant}
        />
      </FadeInContent>
    );
  }

  return (
    <FadeInContent>
      <List disablePadding>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onQuickAddBundle={onQuickAddBundle}
            onRequestDelete={onRequestDelete}
            onTogglePin={onTogglePin}
            deleteDisabled={deletingProductId === product.id}
            variant={variant}
          />
        ))}
      </List>
    </FadeInContent>
  );
});

export default ProductsCatalog;
