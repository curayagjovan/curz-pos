"use client";

import { memo } from "react";
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

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const hasUnit = Boolean(product.unit?.trim());
  const hasDescription = Boolean(product.description?.trim());

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
          <Stack spacing={1.1}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, lineHeight: 1.2 }}
                >
                  {product.name}
                </Typography>
                {hasDescription ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.25 }}
                  >
                    {product.description}
                  </Typography>
                ) : null}
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {hasUnit ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Unit ${product.unit}`}
                />
              ) : null}
              <Chip
                size="small"
                label={`₱${Number(product.price).toFixed(2)}`}
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </Stack>
        </CardActionArea>
      </Card>
    </ListItem>
  );
});

export default ProductCard;
