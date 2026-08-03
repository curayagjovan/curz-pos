"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "@/lib/currency";

type TransactionPayPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  balanceDue: number;
  payAmountInput: string;
  onPayAmountChange: (value: string) => void;
  payChange: number;
  statusError: string | null;
  statusUpdating: boolean;
  onConfirm: () => void;
};

export default function TransactionPayPopover({
  open,
  anchorEl,
  onClose,
  balanceDue,
  payAmountInput,
  onPayAmountChange,
  payChange,
  statusError,
  statusUpdating,
  onConfirm,
}: TransactionPayPopoverProps) {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{ paper: { sx: { p: 2, width: 260 } } }}
    >
      <Stack spacing={1.25}>
        <Box>
          <Typography variant="subtitle2">Collect Payment</Typography>
          <Typography variant="caption" color="text.secondary">
            Balance due {formatCurrency(balanceDue)}
          </Typography>
        </Box>

        <TextField
          autoFocus
          label="Amount received"
          value={payAmountInput}
          onChange={(event) => onPayAmountChange(event.target.value)}
          type="number"
          size="small"
          fullWidth
          slotProps={{
            htmlInput: { min: 0, step: "0.01", inputMode: "decimal" },
          }}
        />

        {payChange > 0 ? (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Change (for reference only)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatCurrency(payChange)}
            </Typography>
          </Stack>
        ) : null}

        {statusError ? (
          <Alert severity="error" sx={{ py: 0 }}>
            {statusError}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={onClose} disabled={statusUpdating}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={onConfirm}
            disabled={statusUpdating}
          >
            {statusUpdating ? "Saving..." : "Confirm"}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}
