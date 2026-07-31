"use client";

import { memo, useMemo, useState } from "react";
import { alpha } from "@mui/material/styles";
import ButtonBase from "@mui/material/ButtonBase";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
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

const easeIOS = "cubic-bezier(0.32, 0.72, 0, 1)";

const CategoryFilterChips = memo(function CategoryFilterChips({
  products,
  value,
  onChange,
}: CategoryFilterChipsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const closeMenu = () => setAnchorEl(null);

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

  const SelectedIcon = selectedOption?.Icon;
  const selectedColor = selectedOption
    ? getCategoryColor(selectedOption.value)
    : null;

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-label="filter by category"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          minHeight: 36,
          px: 1.25,
          borderRadius: "10px",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          bgcolor: selectedColor
            ? alpha(selectedColor, 0.14)
            : "rgba(var(--mui-palette-text-primaryChannel) / 0.06)",
          color: selectedColor ?? "text.secondary",
          transition: `background-color 200ms ${easeIOS}, color 200ms ${easeIOS}`,
          "&:active": { opacity: 0.7 },
        }}
      >
        {SelectedIcon ? (
          <SelectedIcon sx={{ fontSize: 17, color: "inherit" }} />
        ) : null}
        {selectedOption?.label ?? "All Categories"}
        <ExpandMoreRounded sx={{ fontSize: 18, color: "inherit", opacity: 0.6 }} />
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 220, maxHeight: 380 } } }}
      >
        <MenuItem
          selected={value === null}
          onClick={() => {
            onChange(null);
            closeMenu();
          }}
        >
          <ListItemText>All Categories</ListItemText>
          {value === null ? (
            <CheckRounded fontSize="small" sx={{ ml: 1, color: "primary.main" }} />
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
                closeMenu();
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
      </Menu>
    </>
  );
});

export default CategoryFilterChips;
