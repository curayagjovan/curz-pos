"use client";

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
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
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(env(safe-area-inset-bottom) + 72px)",
        px: 1.5,
        pointerEvents: "none",
        zIndex: 9,
        display: "flex",
        justifyContent: expanded ? "stretch" : "flex-end",
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          px: "0 !important",
          display: "flex",
          justifyContent: expanded ? "stretch" : "flex-end",
        }}
      >
        <Paper
          elevation={4}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? "hide sales totals" : "show sales totals"}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle();
            }
          }}
          sx={{
            pointerEvents: "auto",
            cursor: "pointer",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: expanded ? 2 : 999,
            width: expanded ? "100%" : "auto",
            overflow: "hidden",
            transition: "border-radius 200ms ease",
            outline: "none",
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
            },
          }}
        >
          {expanded ? null : (
            <Box
              sx={{
                px: 1.5,
                py: 0.85,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0, textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary">
                  Net Sales · {periodLabel}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                >
                  {toCurrency(netSalesTotal)}
                </Typography>
              </Box>
            </Box>
          )}

          <Collapse in={expanded} timeout={220} unmountOnExit>
            <Box sx={{ p: 1.25 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.75, fontWeight: 700 }}
              >
                {periodLabel}
              </Typography>

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
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                  color="text.secondary"
                >
                  {toCurrency(voidedTotal)}
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Paper>
      </Container>
    </Box>
  );
}
