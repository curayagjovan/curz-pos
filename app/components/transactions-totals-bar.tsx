"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";

function toCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type TransactionsTotalsBarProps = {
  expanded: boolean;
  onToggle: () => void;
  periodLabel: string;
  salesTotal: number;
  netSalesTotal: number;
  refundedTotal: number;
  voidedTotal: number;
  voidedCount: number;
};

export default function TransactionsTotalsBar({
  expanded,
  onToggle,
  periodLabel,
  salesTotal,
  netSalesTotal,
  refundedTotal,
  voidedTotal,
  voidedCount,
}: TransactionsTotalsBarProps) {
  return (
    <>
      <Fab
        color="primary"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-label="show sales totals"
        onClick={onToggle}
        sx={{
          position: "fixed",
          right: "calc(env(safe-area-inset-right) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 88px)",
          zIndex: 1201,
        }}
      >
        <ReceiptLongRounded fontSize="small" />
      </Fab>

      <Drawer
        anchor="bottom"
        open={expanded}
        onClose={onToggle}
        slotProps={{
          paper: {
            sx: {
              pb: "env(safe-area-inset-bottom)",
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
            <Typography variant="h6">Sales Totals</Typography>
            <IconButton onClick={onToggle} aria-label="close sales totals">
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {periodLabel}
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 2 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1.25}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Total Sales
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {toCurrency(salesTotal)}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Net Sales
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {toCurrency(netSalesTotal)}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">
                Refunded Sales
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800 }}
                color="warning.main"
              >
                {toCurrency(refundedTotal)}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              mt: 1.25,
              pt: 1.25,
              borderTop: "1px dashed",
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Voided Orders ({voidedCount})
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700 }}
              color="text.secondary"
            >
              {toCurrency(voidedTotal)}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
