"use client";

import { memo } from "react";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import ListEmptyState from "@/app/components/list-empty-state";
import ProductCard from "@/app/components/product-card";
import type { Product } from "@/types/product";

type ProductsCatalogProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void;
  onQuickAddBundle?: (product: Product, quantity: number) => void;
  onRequestDelete?: (product: Product) => void;
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
  deletingProductId = null,
  variant = "catalog",
}: ProductsCatalogProps) {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (products.length === 0) {
    return <ListEmptyState description="No products found." />;
  }

  return (
    <List disablePadding>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onQuickAddBundle={onQuickAddBundle}
          onRequestDelete={onRequestDelete}
          deleteDisabled={deletingProductId === product.id}
          variant={variant}
        />
      ))}
    </List>
  );
});

export default ProductsCatalog;
