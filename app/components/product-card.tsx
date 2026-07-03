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
  variant?: "catalog" | "inventory";
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

function getBundleMeta(product: Product) {
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
      ? `Bundle ${bundleQty} for ₱${bundlePrice.toFixed(2)}`
      : "No bundle",
  };
}

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  variant = "catalog",
}: ProductCardProps) {
  const hasUnit = Boolean(product.unit?.trim());
  const hasDescription = Boolean(product.description?.trim());
  const { hasBundle, label: bundleLabel } = getBundleMeta(product);

  if (variant === "inventory") {
    return (
      <ListItem disablePadding sx={{ mb: 1 }}>
        <Card
          variant="outlined"
          sx={{
            width: "100%",
            borderRadius: 2,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <CardActionArea
            onClick={() => onAddToCart(product)}
            sx={{
              px: 1.4,
              py: 1.25,
              textAlign: "left",
              "&:last-child": {
                pb: 1.25,
              },
            }}
          >
            <Stack spacing={1.1}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 700, lineHeight: 1.25 }}
                  >
                    {product.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.3 }}
                  >
                    Tap to edit product details
                  </Typography>
                </Box>

                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 800, whiteSpace: "nowrap", pl: 1 }}
                >
                  ₱{Number(product.price).toFixed(2)}
                </Typography>
              </Stack>

              {hasDescription ? (
                <Typography variant="caption" color="text.secondary">
                  {product.description}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`SKU ${product.sku}`}
                />
                {hasUnit ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Unit ${product.unit}`}
                  />
                ) : null}
                <Chip
                  size="small"
                  color={hasBundle ? "success" : "default"}
                  variant={hasBundle ? "filled" : "outlined"}
                  label={bundleLabel}
                />
              </Stack>
            </Stack>
          </CardActionArea>
        </Card>
      </ListItem>
    );
  }

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
                {hasDescription ? product.description : "Tap to add to cart"}
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
                color={hasBundle ? "success" : "default"}
                label={bundleLabel}
              />
            </Stack>
          </Stack>
        </CardActionArea>
      </Card>
    </ListItem>
  );
});

export default ProductCard;
