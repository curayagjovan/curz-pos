"use client";

import { memo, useRef, useState, type TouchEvent } from "react";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";
import { formatCurrency } from "@/lib/currency";

type ManageLoadItemCardProps = {
  item: LoadCatalogItem;
  brandLabel: string;
  onEdit: (item: LoadCatalogItem) => void;
  onRequestDelete: (item: LoadCatalogItem) => void;
  deleteDisabled?: boolean;
};

const SWIPE_ACTION_WIDTH = 92;

const ManageLoadItemCard = memo(function ManageLoadItemCard({
  item,
  brandLabel,
  onEdit,
  onRequestDelete,
  deleteDisabled = false,
}: ManageLoadItemCardProps) {
  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const swipingRef = useRef(false);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    swipingRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
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
    const shouldReveal = dragOffset <= -SWIPE_ACTION_WIDTH / 2;
    setIsDeleteRevealed(shouldReveal);
    setDragOffset(shouldReveal ? -SWIPE_ACTION_WIDTH : 0);

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    swipingRef.current = false;
  };

  const handleCardTap = () => {
    if (isDeleteRevealed) {
      setIsDeleteRevealed(false);
      setDragOffset(0);
      return;
    }

    onEdit(item);
  };

  const handleDeleteTap = () => {
    if (deleteDisabled) {
      return;
    }

    setIsDeleteRevealed(false);
    setDragOffset(0);
    onRequestDelete(item);
  };

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
            <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                  {item.category === "Data Promo" ? item.label : "Regular Load"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  {item.description ? `${brandLabel} · ${item.description}` : brandLabel}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} useFlexGap flexWrap="wrap">
                  <Chip size="small" variant="outlined" label={item.category} />
                  <Chip size="small" variant="outlined" label={item.code} />
                </Stack>
              </Box>
              <Chip
                size="small"
                label={formatCurrency(item.amount)}
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </CardActionArea>
        </Card>
      </Box>
    </ListItem>
  );
});

export default ManageLoadItemCard;
