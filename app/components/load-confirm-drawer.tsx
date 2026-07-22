"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";
import TextField from "@mui/material/TextField";

type LoadConfirmDrawerProps = {
  open: boolean;
  item: LoadCatalogItem | null;
  brandLabel: string;
  price: number;
  markup: number;
  confirmNumber: string;
  completing: boolean;
  sendingRequest: boolean;
  onClose: () => void;
  onConfirmNumberChange: (value: string) => void;
  onSendSms: () => void;
  onComplete: () => void;
};

export default function LoadConfirmDrawer({
  open,
  item,
  brandLabel,
  price,
  markup,
  confirmNumber,
  completing,
  sendingRequest,
  onClose,
  onConfirmNumberChange,
  onSendSms,
  onComplete,
}: LoadConfirmDrawerProps) {
  const busy = completing || sendingRequest;
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
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
          <Typography variant="h6">Request {item?.label}</Typography>
          <IconButton onClick={onClose} aria-label="close" disabled={busy}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography color="text.secondary">Network: {brandLabel}</Typography>
          <Typography color="text.secondary">
            Price: ₱{price.toFixed(2)}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
        >
          <Typography variant="caption" color="text.secondary">
            Recorded as sale: ₱{markup.toFixed(2)}
          </Typography>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.5 }}>
        <TextField
          fullWidth
          value={confirmNumber}
          placeholder="Enter mobile number"
          onChange={(event) => onConfirmNumberChange(event.target.value)}
          slotProps={{
            htmlInput: {
              min: 0,
              step: "0.01",
              inputMode: "tel",
            },
          }}
        />
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="info"
            onClick={onSendSms}
            disabled={busy}
          >
            {sendingRequest ? "Sending..." : "Send Request"}
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
    </SwipeableDrawer>
  );
}
