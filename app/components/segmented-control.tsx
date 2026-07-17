"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";

export type SegmentOption = {
  key: string;
  label: string;
};

type SegmentedControlProps = {
  segments: SegmentOption[];
  selectedKeys: string[];
  onSelect: (key: string) => void;
  ariaLabel?: string;
};

const easeIOS = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function SegmentedControl({
  segments,
  selectedKeys,
  onSelect,
  ariaLabel,
}: SegmentedControlProps) {
  const thumbIndex =
    selectedKeys.length === 1
      ? segments.findIndex((segment) => segment.key === selectedKeys[0])
      : -1;

  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={{
        position: "relative",
        display: "flex",
        p: "2px",
        borderRadius: "10px",
        bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.07)",
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          position: "absolute",
          top: 2,
          bottom: 2,
          left: 2,
          width: `calc((100% - 4px) / ${segments.length})`,
          borderRadius: "8px",
          bgcolor: "#ffffff",
          boxShadow:
            "0 3px 8px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.04)",
          transform:
            thumbIndex >= 0 ? `translateX(${thumbIndex * 100}%)` : "none",
          opacity: thumbIndex >= 0 ? 1 : 0,
          transition: `transform 260ms ${easeIOS}, opacity 200ms ${easeIOS}`,
          ...theme.applyStyles("dark", { bgcolor: "#636366" }),
        })}
      />
      {segments.map((segment) => {
        const selected = selectedKeys.includes(segment.key);

        return (
          <ButtonBase
            key={segment.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(segment.key)}
            sx={{
              position: "relative",
              flex: 1,
              minWidth: 0,
              py: 0.9,
              borderRadius: "8px",
              fontFamily: "inherit",
              fontSize: 13,
              whiteSpace: "nowrap",
              fontWeight: selected ? 600 : 500,
              color: selected
                ? thumbIndex >= 0
                  ? "text.primary"
                  : "primary.main"
                : "text.secondary",
              transition: `color 200ms ${easeIOS}, opacity 160ms ${easeIOS}`,
              "&:active": selected ? undefined : { opacity: 0.5 },
            }}
          >
            {segment.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
