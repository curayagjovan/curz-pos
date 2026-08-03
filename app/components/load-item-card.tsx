"use client";

import { memo } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  LOAD_BRAND_COLORS,
  LOAD_BRAND_LOGOS,
  type LoadCatalogItem,
} from "@/lib/mobile-load-catalog";
import { formatCurrency } from "@/lib/currency";

type LoadItemCardProps = {
  item: LoadCatalogItem;
  brandLabel: string;
  price: number;
  onSelect: (item: LoadCatalogItem) => void;
};

const LoadItemCard = memo(function LoadItemCard({
  item,
  brandLabel,
  price,
  onSelect,
}: LoadItemCardProps) {
  const brandColor = LOAD_BRAND_COLORS[item.brand];

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <CardActionArea
          onClick={() => onSelect(item)}
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
              src={LOAD_BRAND_LOGOS[item.brand]}
              slotProps={{
                img: { style: { objectFit: "contain", padding: 4 } },
              }}
              sx={{
                width: 34,
                height: 34,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: "#ffffff",
                color: brandColor,
              }}
            >
              {brandLabel.slice(0, 2).toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, lineHeight: 1.25 }}
              >
                {item.category === "Data Promo" ? item.label : "Regular Load"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25 }}
              >
                {item.description
                  ? `${brandLabel} · ${item.description}`
                  : brandLabel}
              </Typography>
            </Box>

            <Chip
              size="small"
              label={formatCurrency(price)}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </CardActionArea>
      </Card>
    </ListItem>
  );
});

export default LoadItemCard;
