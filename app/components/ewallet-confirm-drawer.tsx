"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { EWalletDirection, EWalletProvider } from "@/lib/ewallet-catalog";

type EWalletConfirmDrawerProps = {
  open: boolean;
  provider: EWalletProvider;
  providerLabel: string;
  direction: EWalletDirection;
  directionLabel: string;
  amount: number;
  fee: number;
  accountNumber: string;
  sharing: boolean;
  completing: boolean;
  onClose: () => void;
  onAccountNumberChange: (value: string) => void;
  onShare: () => void;
  onComplete: () => void;
};

export default function EWalletConfirmDrawer({
  open,
  providerLabel,
  direction,
  directionLabel,
  amount,
  fee,
  accountNumber,
  sharing,
  completing,
  onClose,
  onAccountNumberChange,
  onShare,
  onComplete,
}: EWalletConfirmDrawerProps) {
  const isCashIn = direction === "CASH_IN";
  const total = amount + fee;
  const busy = sharing || completing;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            pb: "env(safe-area-inset-bottom)",
            maxHeight: "78dvh",
          },
        },
      }}
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6">
            {providerLabel} {directionLabel}
          </Typography>
          <IconButton onClick={onClose} aria-label="close" disabled={busy}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">
              {isCashIn ? "Amount to send" : "Amount to hand customer"}
            </Typography>
            <Typography>₱{amount.toFixed(2)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">Service fee</Typography>
            <Typography>₱{fee.toFixed(2)}</Typography>
          </Stack>
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {isCashIn ? "Customer pays" : "Recorded as sale"}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              ₱{(isCashIn ? total : fee).toFixed(2)}
            </Typography>
          </Stack>
        </Stack>

        {isCashIn ? (
          <TextField
            fullWidth
            value={accountNumber}
            placeholder="Recipient mobile number"
            onChange={(event) => onAccountNumberChange(event.target.value)}
            sx={{ mt: 2 }}
            slotProps={{
              htmlInput: {
                inputMode: "tel",
              },
            }}
          />
        ) : null}

        <Stack spacing={1} sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onShare}
            disabled={busy}
          >
            {sharing ? "Sharing..." : "Share Request"}
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={onComplete}
            disabled={busy}
          >
            {completing ? "Saving..." : "Completed"}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
