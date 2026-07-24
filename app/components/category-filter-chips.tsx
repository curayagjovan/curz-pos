"use client";

import { memo, useMemo } from "react";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import {
  PRODUCT_CATEGORY_OPTIONS,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import type { Product } from "@/types/product";

type CategoryFilterChipsProps = {
  products: Product[];
  value: ProductCategoryValue | null;
  onChange: (value: ProductCategoryValue | null) => void;
};

const CategoryFilterChips = memo(function CategoryFilterChips({
  products,
  value,
  onChange,
}: CategoryFilterChipsProps) {
  const availableOptions = useMemo(() => {
    const present = new Set(products.map((product) => product.category));
    return PRODUCT_CATEGORY_OPTIONS.filter((option) =>
      present.has(option.value),
    );
  }, [products]);

  if (availableOptions.length <= 1) {
    return null;
  }

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        overflowX: "auto",
        pb: 0.5,
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Chip
        size="small"
        label="All"
        color={value === null ? "primary" : "default"}
        variant={value === null ? "filled" : "outlined"}
        onClick={() => onChange(null)}
      />
      {availableOptions.map(({ value: optionValue, label, Icon }) => (
        <Chip
          key={optionValue}
          size="small"
          icon={<Icon fontSize="small" />}
          label={label}
          color={value === optionValue ? "primary" : "default"}
          variant={value === optionValue ? "filled" : "outlined"}
          onClick={() =>
            onChange(value === optionValue ? null : optionValue)
          }
        />
      ))}
    </Stack>
  );
});

export default CategoryFilterChips;
