"use client";

import { memo } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddShoppingCartRounded from "@mui/icons-material/AddShoppingCartRounded";
import type { Product } from "@/types/product";

type ProductsCatalogProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  onAddToCart: (product: Product) => void;
};

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Card variant="outlined" sx={{ width: "100%" }}>
        <CardContent
          sx={{
            py: 1.25,
            "&:last-child": {
              pb: 1.25,
            },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, lineHeight: 1.3 }}
              >
                {product.name}
              </Typography>

              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: 0.8 }}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  label={`SKU: ${product.sku}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Stock: ${Number(product.stock)}`}
                />
              </Stack>
            </Box>

            <Stack alignItems="flex-end" spacing={0.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                ₱{Number(product.price).toFixed(2)}
              </Typography>
              <IconButton
                color="primary"
                size="small"
                onClick={() => onAddToCart(product)}
                aria-label={`add ${product.name} to cart`}
              >
                <AddShoppingCartRounded fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </ListItem>
  );
});

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
