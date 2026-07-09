"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
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
  confirmNumber: string;
  sending: boolean;
  onClose: () => void;
  onConfirmNumberChange: (value: string) => void;
  onSend: () => void;
};

export default function LoadConfirmDrawer({
  open,
  item,
  brandLabel,
  confirmNumber,
  sending,
  onClose,
  onConfirmNumberChange,
  onSend,
}: LoadConfirmDrawerProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          pb: "env(safe-area-inset-bottom)",
          maxHeight: "78dvh",
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
          <IconButton onClick={onClose} aria-label="close" disabled={sending}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {brandLabel} · ₱{item?.amount.toFixed(2)}
        </Typography>
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

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={onSend}
            disabled={sending}
          >
            {sending ? "Sharing..." : "Share Request"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
