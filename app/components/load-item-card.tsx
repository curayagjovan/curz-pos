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
import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";

type LoadItemCardProps = {
  item: LoadCatalogItem;
  brandLabel: string;
  onSelect: (item: LoadCatalogItem) => void;
};

const LoadItemCard = memo(function LoadItemCard({
  item,
  brandLabel,
  onSelect,
}: LoadItemCardProps) {
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
              sx={{
                width: 34,
                height: 34,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: "action.selected",
                color: "text.primary",
              }}
            >
              {brandLabel.slice(0, 2).toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, lineHeight: 1.25 }}
              >
                Regular Load
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25 }}
              >
                {brandLabel}
              </Typography>
            </Box>

            <Chip
              size="small"
              label={`₱${item.amount.toFixed(2)}`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </CardActionArea>
      </Card>
    </ListItem>
  );
});

export default LoadItemCard;
