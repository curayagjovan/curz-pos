"use client";

import { memo } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ProductCard from "@/app/components/product-card";
import type { Product } from "@/types/product";

type ProductsCatalogProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  onAddToCart: (product: Product) => void;
};

const ProductsCatalog = memo(function ProductsCatalog({
  products,
  loading,
  error,
  onAddToCart,
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
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No products found.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <List disablePadding>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </List>
  );
});

export default ProductsCatalog;
