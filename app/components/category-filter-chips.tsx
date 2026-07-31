"use client";

import { memo, useMemo, useState } from "react";
import Badge from "@mui/material/Badge";
import CheckRounded from "@mui/icons-material/CheckRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Popover from "@mui/material/Popover";
import {
  getCategoryColor,
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const closePopover = () => setAnchorEl(null);

  const availableOptions = useMemo(() => {
    const present = new Set(products.map((product) => product.category));
    return PRODUCT_CATEGORY_OPTIONS.filter((option) =>
      present.has(option.value),
    );
  }, [products]);

  const selectedOption = useMemo(
    () => availableOptions.find((option) => option.value === value) ?? null,
    [availableOptions, value],
  );

  if (availableOptions.length <= 1) {
    return null;
  }

  const selectedColor = selectedOption
    ? getCategoryColor(selectedOption.value)
    : null;
  const SelectedIcon = selectedOption?.Icon;

  return (
    <>
      <Badge
        color="primary"
        variant="dot"
        overlap="circular"
        invisible={!selectedOption}
      >
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label="filter by category"
          aria-haspopup="true"
          sx={{
            borderRadius: 1,
            bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.06)",
            color: selectedColor ?? "text.secondary",
          }}
        >
          {SelectedIcon ? (
            <SelectedIcon fontSize="small" />
          ) : (
            <FilterListRounded fontSize="small" />
          )}
        </IconButton>
      </Badge>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, maxHeight: 380 } } }}
      >
        <MenuList>
          <MenuItem
            selected={value === null}
            onClick={() => {
              onChange(null);
              closePopover();
            }}
          >
            <ListItemText>All Categories</ListItemText>
            {value === null ? (
              <CheckRounded
                fontSize="small"
                sx={{ ml: 1, color: "primary.main" }}
              />
            ) : null}
          </MenuItem>
          {availableOptions.map(({ value: optionValue, label, Icon }) => {
            const selected = value === optionValue;
            const categoryColor = getCategoryColor(optionValue);

            return (
              <MenuItem
                key={optionValue}
                selected={selected}
                onClick={() => {
                  onChange(optionValue);
                  closePopover();
                }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" sx={{ color: categoryColor }} />
                </ListItemIcon>
                <ListItemText>{label}</ListItemText>
                {selected ? (
                  <CheckRounded
                    fontSize="small"
                    sx={{ ml: 1, color: categoryColor }}
                  />
                ) : null}
              </MenuItem>
            );
          })}
        </MenuList>
      </Popover>
    </>
  );
});

export default CategoryFilterChips;
