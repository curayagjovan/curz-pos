"use client";

import { memo, useMemo } from "react";
import FilterPopoverButton from "@/app/components/filter-popover-button";
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

const ALL_KEY = "all";

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

  const options = useMemo(
    () => [
      { key: ALL_KEY, label: "All Categories" },
      ...availableOptions.map(({ value: optionValue, label, Icon }) => ({
        key: optionValue,
        label,
        icon: Icon,
        color: getCategoryColor(optionValue),
      })),
    ],
    [availableOptions],
  );

  if (availableOptions.length <= 1) {
    return null;
  }

  return (
    <FilterPopoverButton
      ariaLabel="filter by category"
      options={options}
      selectedKeys={[value ?? ALL_KEY]}
      onSelect={(key) =>
        onChange(key === ALL_KEY ? null : (key as ProductCategoryValue))
      }
    />
  );
});

export default CategoryFilterChips;
