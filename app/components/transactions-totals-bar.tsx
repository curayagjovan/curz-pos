"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

function toCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type TransactionsTotalsBarProps = {
  salesTotal: number;
  netSalesTotal: number;
  refundedTotal: number;
  voidedTotal: number;
  voidedCount: number;
};

export default function TransactionsTotalsBar({
  salesTotal,
  netSalesTotal,
  refundedTotal,
  voidedTotal,
  voidedCount,
}: TransactionsTotalsBarProps) {
  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(env(safe-area-inset-bottom) + 68px)",
        px: 1.5,
        py: 1,
        pointerEvents: "none",
        zIndex: 8,
      }}
    >
      <Container maxWidth="sm" sx={{ px: "0 !important" }}>
        <Paper
          elevation={4}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            p: 1.25,
            pointerEvents: "auto",
          }}
        >
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
              mt: 0.75,
              pt: 0.75,
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
            <Typography variant="body2" sx={{ fontWeight: 700 }} color="text.secondary">
              {toCurrency(voidedTotal)}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
