"use client";

import { memo } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Product } from "@/types/product";
import CardActionArea from "@mui/material/CardActionArea";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

function getProductInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "--";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const bundleQty =
    product.bundleQty == null ? null : Number(product.bundleQty);
  const bundlePrice =
    product.bundlePrice == null ? null : Number(product.bundlePrice);

  const bundleDealText =
    bundleQty != null &&
    Number.isFinite(bundleQty) &&
    bundleQty > 0 &&
    bundlePrice != null &&
    Number.isFinite(bundlePrice)
      ? `${bundleQty} for ₱${bundlePrice.toFixed(2)}`
      : "N/A";

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          borderColor: "divider",
        }}
      >
        <CardActionArea
          onClick={() => onAddToCart(product)}
          sx={{
            px: 1.25,
            py: 1.1,
            "&:last-child": {
              pb: 1.1,
            },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 34,
                height: 34,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: "action.selected",
                color: "text.primary",
              }}
            >
              {getProductInitials(product.name)}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, lineHeight: 1.25 }}
              >
                {product.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25 }}
              >
                Tap to add to cart
              </Typography>
            </Box>

            <Stack alignItems="flex-end" spacing={0.75}>
              <Chip
                size="small"
                label={`Unit ₱${Number(product.price).toFixed(2)}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                variant="outlined"
                color={bundleDealText === "N/A" ? "default" : "success"}
                label={
                  bundleDealText === "N/A"
                    ? "Bundle N/A"
                    : `Bundle ${bundleDealText}`
                }
              />
            </Stack>
          </Stack>
        </CardActionArea>
      </Card>
    </ListItem>
  );
});

export default ProductCard;
