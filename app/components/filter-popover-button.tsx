"use client";

import { useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import CheckRounded from "@mui/icons-material/CheckRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Popover from "@mui/material/Popover";
import type { SvgIconProps } from "@mui/material/SvgIcon";

export type FilterPopoverOption = {
  key: string;
  label: string;
  icon?: React.ComponentType<SvgIconProps>;
  color?: string;
};

type FilterPopoverButtonProps = {
  ariaLabel: string;
  /** The first entry is treated as the "clear filter" option (e.g. "All"). */
  options: FilterPopoverOption[];
  selectedKeys: string[];
  onSelect: (key: string) => void;
  /** Set false for a plain mode toggle where every option is a deliberate
   * choice rather than an optional filter — hides the "filter active" dot. */
  showActiveBadge?: boolean;
  /** Borders the button to match an adjacent outlined TextField, instead of
   * the default filled-pill look. */
  outlined?: boolean;
};

export default function FilterPopoverButton({
  ariaLabel,
  options,
  selectedKeys,
  onSelect,
  showActiveBadge = true,
  outlined = false,
}: FilterPopoverButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const closePopover = () => setAnchorEl(null);

  const allOption = options[0];
  const isAllSelected =
    selectedKeys.length === 0 ||
    selectedKeys.every((key) => key === allOption?.key);

  const selectedOption =
    selectedKeys.length === 1
      ? options.find((option) => option.key === selectedKeys[0]) ?? null
      : null;
  const SelectedIcon = selectedOption?.icon;

  return (
    <>
      <Badge
        color="primary"
        variant="dot"
        overlap="circular"
        invisible={!showActiveBadge || isAllSelected}
      >
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label={ariaLabel}
          aria-haspopup="true"
          sx={
            outlined
              ? {
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor:
                    selectedOption?.color ??
                    "rgba(var(--mui-palette-common-onBackgroundChannel) / 0.23)",
                  color: selectedOption?.color ?? "text.secondary",
                }
              : {
                  borderRadius: 1,
                  bgcolor:
                    "rgba(var(--mui-palette-text-primaryChannel) / 0.06)",
                  color: selectedOption?.color ?? "text.secondary",
                }
          }
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
          {options.map((option) => {
            const Icon = option.icon;
            const selected =
              option.key === allOption?.key
                ? isAllSelected
                : selectedKeys.includes(option.key);

            return (
              <MenuItem
                key={option.key}
                selected={selected}
                onClick={() => {
                  onSelect(option.key);
                  closePopover();
                }}
              >
                {Icon ? (
                  <ListItemIcon>
                    <Icon fontSize="small" sx={{ color: option.color }} />
                  </ListItemIcon>
                ) : option.color ? (
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: option.color,
                      }}
                    />
                  </ListItemIcon>
                ) : null}
                <ListItemText>{option.label}</ListItemText>
                {selected ? (
                  <CheckRounded
                    fontSize="small"
                    sx={{ ml: 1, color: option.color ?? "primary.main" }}
                  />
                ) : null}
              </MenuItem>
            );
          })}
        </MenuList>
      </Popover>
    </>
  );
}
