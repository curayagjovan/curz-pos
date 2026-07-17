"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import CancelRounded from "@mui/icons-material/CancelRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import DialpadRounded from "@mui/icons-material/DialpadRounded";

type ProductsSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  icon?: "search" | "mobile" | "none";
  sticky?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "search";
  autoFocus?: boolean;
};

export default function ProductsSearchBar({
  value,
  onChange,
  placeholder = "Search products",
  ariaLabel = "search products",
  icon = "search",
  sticky = true,
  inputMode,
  autoFocus,
}: ProductsSearchBarProps) {
  return (
    <Box
      sx={
        sticky
          ? {
              position: "sticky",
              top: 0,
              zIndex: 5,
              pt: 1,
              pb: 1,
              bgcolor: "background.default",
            }
          : { py: 0.5 }
      }
    >
      <Box
        role="search"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          minHeight: 38,
          borderRadius: "10px",
          bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.06)",
          transition: "background-color 200ms cubic-bezier(0.32, 0.72, 0, 1)",
          "&:focus-within": {
            bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.09)",
          },
        }}
      >
        {icon === "mobile" ? (
          <DialpadRounded fontSize="small" sx={{ color: "text.secondary" }} />
        ) : icon === "search" ? (
          <SearchRounded fontSize="small" sx={{ color: "text.secondary" }} />
        ) : null}
        <InputBase
          value={value}
          onChange={(event) => onChange(event.target.value)}
          sx={{ flex: 1 }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputProps={{ "aria-label": ariaLabel, inputMode }}
        />
        {value.trim().length > 0 ? (
          <IconButton
            type="button"
            size="small"
            sx={{ p: 0.25, mr: -0.5, color: "text.secondary" }}
            aria-label="clear"
            onClick={() => onChange("")}
          >
            <CancelRounded sx={{ fontSize: 18 }} />
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
}
