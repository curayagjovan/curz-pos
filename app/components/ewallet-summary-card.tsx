"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "@/lib/currency";

type EWalletSummaryCardProps = {
  isCashIn: boolean;
  amount: number;
  fee: number;
};

export default function EWalletSummaryCard({
  isCashIn,
  amount,
  fee,
}: EWalletSummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <Box sx={{ p: 1.5 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">
              {isCashIn ? "Amount to send" : "Amount to hand customer"}
            </Typography>
            <Typography>{formatCurrency(amount)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">Service fee</Typography>
            <Typography>{formatCurrency(fee)}</Typography>
          </Stack>
          <Divider sx={{ my: 0.5 }} />
          {isCashIn ? (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontWeight: 700 }}>Customer pays</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {formatCurrency(amount + fee)}
              </Typography>
            </Stack>
          ) : null}
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">Recorded as sale</Typography>
            <Typography color="text.secondary">
              {formatCurrency(amount + fee)}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}
