"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "@/lib/currency";

type TransactionRefundDetailsProps = {
  returnedUnitCount: number;
  refundAmount: number | string | null;
  remainingAmount: number;
};

export default function TransactionRefundDetails({
  returnedUnitCount,
  refundAmount,
  remainingAmount,
}: TransactionRefundDetailsProps) {
  return (
    <>
      <Divider />
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.75, letterSpacing: 0.3 }}
        >
          Refund Details
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          divider={<Divider orientation="vertical" flexItem />}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Items Returned
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
              {returnedUnitCount}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Refund Amount
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 800, mt: 0.15, color: "warning.main" }}
            >
              {formatCurrency(refundAmount)}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Remaining Amount
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
              {formatCurrency(remainingAmount)}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </>
  );
}
