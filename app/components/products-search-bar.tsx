"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import DialpadIcon from "@mui/icons-material/Dialpad";

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
  icon,
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
      <Paper
        sx={{
          p: "2px 6px",
          display: "flex",
          alignItems: "center",
          width: "100%",
          minHeight: 40,
        }}
        elevation={0}
        variant="outlined"
      >
        <InputBase
          value={value}
          onChange={(event) => onChange(event.target.value)}
          sx={{ ml: 1, flex: 1 }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputProps={{ "aria-label": ariaLabel, inputMode }}
        />
        {value.trim().length > 0 ? (
          <IconButton
            type="button"
            sx={{ p: 1 }}
            aria-label="clear"
            onClick={() => onChange("")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
        {icon === "search" ? (
          <IconButton type="button" sx={{ p: 1 }} aria-label="search">
            <SearchIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton type="button" sx={{ p: 1 }} aria-label="search">
            <DialpadIcon fontSize="small" />
          </IconButton>
        )}
      </Paper>
    </Box>
  );
}
