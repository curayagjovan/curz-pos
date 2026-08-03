"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "@/lib/currency";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type EWalletAmountInputProps = {
  label: string;
  amount: number;
  amountInput: string;
  amountFocused: boolean;
  onAmountInputChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
};

export default function EWalletAmountInput({
  label,
  amount,
  amountInput,
  amountFocused,
  onAmountInputChange,
  onFocusChange,
}: EWalletAmountInputProps) {
  return (
    <Box sx={{ textAlign: "center", py: 0.5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        {label}
      </Typography>
      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        spacing={0.5}
        sx={{ mt: 0.25 }}
      >
        <Typography
          sx={{
            fontSize: 28,
            fontWeight: 700,
            color: amount > 0 ? "text.primary" : "text.disabled",
          }}
        >
          ₱
        </Typography>
        <InputBase
          value={amountInput}
          onChange={(event) => onAmountInputChange(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder={amountFocused ? "" : "0.00"}
          type="number"
          autoFocus={false}
          slotProps={{
            input: {
              inputMode: "decimal",
              min: 0,
              step: "0.01",
              style: { textAlign: "center", padding: 0 },
            },
          }}
          sx={{
            fontSize: 44,
            fontWeight: 800,
            width: `${Math.max(2, amountFocused ? amountInput.length : (amountInput || "0.00").length) + 1}ch`,
          }}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        flexWrap="wrap"
        justifyContent="center"
        sx={{ mt: 1.5 }}
      >
        {QUICK_AMOUNTS.map((quickAmount) => (
          <Chip
            key={quickAmount}
            size="small"
            clickable
            label={formatCurrency(quickAmount)}
            onClick={() => onAmountInputChange(String(quickAmount))}
          />
        ))}
      </Stack>
    </Box>
  );
}
