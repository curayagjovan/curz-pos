"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/currency";
import CardActionArea from "@mui/material/CardActionArea";
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_ICONS,
  PRODUCT_CATEGORY_LABELS,
  getCategoryColor,
  isValidProductCategory,
} from "@/lib/product-categories";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void;
  onRequestDelete?: (product: Product) => void;
  deleteDisabled?: boolean;
  variant?: "catalog" | "inventory";
};

const SWIPE_ACTION_WIDTH = 92;
// Delay before a press starts auto-adding, and the pace of each add while
// held — tuned so a quick tap never triggers it, but a deliberate hold can
// stack up a multi-unit sale (e.g. 6 sodas) without repeated tapping.
const LONG_PRESS_DELAY_MS = 350;
const HOLD_REPEAT_INTERVAL_MS = 140;

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
      ? `Bundle ${bundleQty} for ${formatCurrency(bundlePrice)}`
      : "",
  };
}

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  onRequestDelete,
  deleteDisabled = false,
  variant = "catalog",
}: ProductCardProps) {
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
  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAddedFeedbackVisible, setIsAddedFeedbackVisible] = useState(false);
  const [addedFeedbackCount, setAddedFeedbackCount] = useState(1);
  const [holdAddCount, setHoldAddCount] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const swipingRef = useRef(false);
  const addedFeedbackTimeoutRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const holdCountRef = useRef(0);
  const isLongPressRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (addedFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(addedFeedbackTimeoutRef.current);
      }
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
      }
      if (holdIntervalRef.current !== null) {
        window.clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const triggerAddedFeedback = (count = 1) => {
    if (addedFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(addedFeedbackTimeoutRef.current);
    }

    setAddedFeedbackCount(count);
    setIsAddedFeedbackVisible(true);
    addedFeedbackTimeoutRef.current = window.setTimeout(() => {
      setIsAddedFeedbackVisible(false);
      addedFeedbackTimeoutRef.current = null;
    }, 820);
  };

  const clearHoldTimers = () => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const handleCatalogPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    isLongPressRef.current = false;
    holdCountRef.current = 0;
    clearHoldTimers();

    holdTimeoutRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      holdIntervalRef.current = window.setInterval(() => {
        holdCountRef.current += 1;
        setHoldAddCount(holdCountRef.current);
        onAddToCart(product);
      }, HOLD_REPEAT_INTERVAL_MS);
    }, LONG_PRESS_DELAY_MS);
  };

  const endCatalogHold = () => {
    clearHoldTimers();

    if (isLongPressRef.current) {
      triggerAddedFeedback(holdCountRef.current);
      suppressClickRef.current = true;
    }

    setHoldAddCount(0);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (variant !== "inventory" || !onRequestDelete) {
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    swipingRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (
      variant !== "inventory" ||
      !onRequestDelete ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null
    ) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    if (!swipingRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      if (Math.abs(deltaX) > 8) {
        swipingRef.current = true;
      }
    }

    if (!swipingRef.current) {
      return;
    }

    const baseOffset = isDeleteRevealed ? -SWIPE_ACTION_WIDTH : 0;
    const nextOffset = Math.min(
      0,
      Math.max(-SWIPE_ACTION_WIDTH, baseOffset + deltaX),
    );
    setDragOffset(nextOffset);
  };

  const handleTouchEnd = () => {
    if (variant !== "inventory" || !onRequestDelete) {
      return;
    }

    const shouldReveal = dragOffset <= -SWIPE_ACTION_WIDTH / 2;
    setIsDeleteRevealed(shouldReveal);
    setDragOffset(shouldReveal ? -SWIPE_ACTION_WIDTH : 0);

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    swipingRef.current = false;
  };

  const handleInventoryCardTap = () => {
    if (isDeleteRevealed) {
      setIsDeleteRevealed(false);
      setDragOffset(0);
      return;
    }

    onAddToCart(product);
  };

  const handleDeleteTap = () => {
    if (!onRequestDelete || deleteDisabled) {
      return;
    }

    setIsDeleteRevealed(false);
    setDragOffset(0);
    onRequestDelete(product);
  };

  const handleCatalogCardTap = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      isLongPressRef.current = false;
      return;
    }

    triggerAddedFeedback(1);
    onAddToCart(product, event.currentTarget.getBoundingClientRect());
  };

  if (variant === "inventory") {
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
              transition: swipingRef.current
                ? "none"
                : "transform 0.18s ease-out",
            }}
          >
            <CardActionArea
              onClick={handleInventoryCardTap}
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
                    {/* <Typography
                      variant="caption"
                      fontSize={6}
                    >{`SKU ${product.sku}`}</Typography> */}
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
                addedFeedbackCount > 1
                  ? `Added ×${addedFeedbackCount}`
                  : "Added"
              }
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>

        <CardActionArea
          onClick={handleCatalogCardTap}
          onPointerDown={handleCatalogPointerDown}
          onPointerUp={endCatalogHold}
          onPointerLeave={endCatalogHold}
          onPointerCancel={endCatalogHold}
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
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, lineHeight: 1.25 }}
              >
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
});

export default ProductCard;
