"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
  EWALLET_PROVIDER_COLORS,
  EWALLET_PROVIDER_LOGOS,
  EWALLET_PROVIDERS,
  type EWalletProvider,
} from "@/lib/ewallet-catalog";

type EWalletProviderPickerProps = {
  value: EWalletProvider;
  onChange: (provider: EWalletProvider) => void;
};

export default function EWalletProviderPicker({
  value,
  onChange,
}: EWalletProviderPickerProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Provider
      </Typography>
      <Stack direction="row" spacing={1.25}>
        {EWALLET_PROVIDERS.map(({ provider: entryProvider, label }) => {
          const selected = entryProvider === value;
          const color = EWALLET_PROVIDER_COLORS[entryProvider];

          return (
            <ButtonBase
              key={entryProvider}
              onClick={() => onChange(entryProvider)}
              aria-pressed={selected}
              sx={{
                flex: 1,
                flexDirection: "column",
                gap: 0.75,
                py: 1.25,
                borderRadius: 1,
                border: "2px solid",
                borderColor: selected ? color : "divider",
                bgcolor: selected ? alpha(color, 0.1) : "transparent",
                transition:
                  "border-color 200ms ease, background-color 200ms ease",
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: entryProvider === "MAYA" ? "#0b0b0c" : "#ffffff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.16)",
                }}
              >
                <Box
                  component="img"
                  src={EWALLET_PROVIDER_LOGOS[entryProvider]}
                  alt={label}
                  sx={{
                    width: "76%",
                    height: "58%",
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: selected ? color : "text.primary",
                }}
              >
                {label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Stack>
    </Stack>
  );
}
