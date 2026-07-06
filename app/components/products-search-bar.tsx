"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

type ProductsSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

export default function ProductsSearchBar({
  value,
  onChange,
  placeholder = "Search products",
  ariaLabel = "search products",
}: ProductsSearchBarProps) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        pt: 1,
        pb: 1,
        bgcolor: "background.default",
      }}
    >
      <Paper
        sx={{
          p: "2px 6px",
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        <InputBase
          value={value}
          onChange={(event) => onChange(event.target.value)}
          sx={{ ml: 1, flex: 1 }}
          placeholder={placeholder}
          inputProps={{ "aria-label": ariaLabel }}
        />
        {value.trim().length > 0 ? (
          <IconButton
            type="button"
            sx={{ p: 1 }}
            aria-label="clear search"
            onClick={() => onChange("")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
        <IconButton type="button" sx={{ p: 1 }} aria-label="search">
          <SearchIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Box>
  );
}
