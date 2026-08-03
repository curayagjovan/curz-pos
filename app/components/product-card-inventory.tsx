"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
import { useSwipeToDelete } from "@/app/hooks/use-swipe-to-delete";

const SWIPE_ACTION_WIDTH = 92;

type ProductCardInventoryProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
  onRequestDelete?: (product: Product) => void;
  deleteDisabled?: boolean;
};

export default function ProductCardInventory({
  product,
  onAddToCart,
  onRequestDelete,
  deleteDisabled = false,
}: ProductCardInventoryProps) {
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
    isDeleteRevealed,
    dragOffset,
    swipingRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleCardTap,
    handleDeleteTap,
  } = useSwipeToDelete(product, onAddToCart, onRequestDelete, deleteDisabled);

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Box
        sx={{
          width: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: 2,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "stretch",
            pointerEvents: isDeleteRevealed ? "auto" : "none",
          }}
        >
          <Button
            onClick={handleDeleteTap}
            disabled={deleteDisabled}
            startIcon={<DeleteOutlineRounded fontSize="small" />}
            variant="contained"
            color="error"
            sx={{
              width: SWIPE_ACTION_WIDTH,
              borderRadius: 0,
              boxShadow: "none",
              color: "red.700",
            }}
          >
            Delete
          </Button>
        </Box>

        <Card
          variant="outlined"
          sx={{
            width: "100%",
            borderRadius: 2,
            borderTopRightRadius: swipingRef.current ? 0 : 2,
            borderBottomRightRadius: swipingRef.current ? 0 : 2,
            borderColor: "divider",
            bgcolor: "background.paper",
            transform: `translateX(${dragOffset}px)`,
            transition: swipingRef.current ? "none" : "transform 0.18s ease-out",
          }}
        >
          <CardActionArea
            onClick={handleCardTap}
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
                  <Typography variant="caption" color="text.secondary">
                    Product Name
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 700, lineHeight: 1.25 }}
                  >
                    {product.name}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Product Price
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, whiteSpace: "nowrap", pl: 1 }}
                  >
                    {formatCurrency(product.price)}
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: `6px !important` }}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<CategoryIcon fontSize="small" />}
                  label={categoryLabel}
                  sx={{
                    borderColor: categoryColor,
                    color: categoryColor,
                    "& .MuiChip-icon": { color: categoryColor },
                  }}
                />

                {hasDescription ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${product.description}`}
                  />
                ) : null}
                {hasBundle ? (
                  <Chip
                    size="small"
                    color="success"
                    variant="filled"
                    label={bundleLabel}
                    sx={{ ml: "auto" }}
                  />
                ) : null}
              </Stack>
            </Stack>
          </CardActionArea>
        </Card>
      </Box>
    </ListItem>
  );
}
