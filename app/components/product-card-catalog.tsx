"use client";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/currency";
import { getBundleMeta } from "@/lib/product-bundle-meta";
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_ICONS,
  PRODUCT_CATEGORY_LABELS,
  getCategoryColor,
  isValidProductCategory,
} from "@/lib/product-categories";
import { useCatalogAddGesture } from "@/app/hooks/use-catalog-add-gesture";

type ProductCardCatalogProps = {
  product: Product;
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void;
};

export default function ProductCardCatalog({
  product,
  onAddToCart,
}: ProductCardCatalogProps) {
  const hasDescription = Boolean(product.description?.trim());
  const { hasBundle, label: bundleLabel } = getBundleMeta(product);
  // Products cached in IndexedDB before the category field shipped won't
  // have one until the next refetch — fall back rather than crash on render.
  const safeCategory = isValidProductCategory(product.category)
    ? product.category
    : DEFAULT_PRODUCT_CATEGORY;
  const categoryColor = getCategoryColor(safeCategory);
  const CategoryIcon = PRODUCT_CATEGORY_ICONS[safeCategory];
  const categoryLabel = PRODUCT_CATEGORY_LABELS[safeCategory];

  const {
    isAddedFeedbackVisible,
    addedFeedbackCount,
    holdAddCount,
    handlePointerDown,
    endHold,
    handleCardTap,
  } = useCatalogAddGesture(product, onAddToCart);

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          borderColor: "divider",
          position: "relative",
          overflow: "hidden",
          transform: isAddedFeedbackVisible ? "scale(0.985)" : "scale(1)",
          boxShadow: isAddedFeedbackVisible
            ? "0 0 0 1px rgba(76, 175, 80, 0.45), 0 10px 22px rgba(76, 175, 80, 0.18)"
            : undefined,
          transition:
            "transform 140ms ease, box-shadow 220ms ease, border-color 220ms ease",
          ...(isAddedFeedbackVisible
            ? {
                borderColor: "success.main",
              }
            : null),
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 2,
            opacity: isAddedFeedbackVisible || holdAddCount > 0 ? 1 : 0,
            transform:
              isAddedFeedbackVisible || holdAddCount > 0
                ? "translateY(0) scale(1)"
                : "translateY(-6px) scale(0.96)",
            transition: "opacity 160ms ease, transform 180ms ease",
            pointerEvents: "none",
          }}
        >
          {holdAddCount > 0 ? (
            <Chip
              size="small"
              color="primary"
              label={`+${holdAddCount}`}
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <Chip
              icon={<CheckCircleRounded fontSize="small" />}
              size="small"
              color="success"
              label={
                addedFeedbackCount > 1 ? `Added ×${addedFeedbackCount}` : "Added"
              }
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>

        <CardActionArea
          onClick={handleCardTap}
          onPointerDown={handlePointerDown}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(event) => event.preventDefault()}
          sx={{
            px: 1.25,
            py: 1.1,
            userSelect: "none",
            WebkitTouchCallout: "none",
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
                bgcolor: alpha(categoryColor, 0.16),
              }}
            >
              <CategoryIcon sx={{ color: categoryColor, fontSize: 18 }} />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                {product.name}
              </Typography>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: 0.25 }}
              >
                <Typography variant="caption" color="text.secondary">
                  {hasDescription
                    ? `${categoryLabel}, ${product.description}`
                    : categoryLabel}
                </Typography>
                {hasBundle ? (
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={bundleLabel}
                    sx={{
                      height: 18,
                      fontSize: "0.75rem",
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                ) : null}
              </Stack>
            </Box>

            <Chip
              size="small"
              label={formatCurrency(product.price)}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </CardActionArea>
      </Card>
    </ListItem>
  );
}
