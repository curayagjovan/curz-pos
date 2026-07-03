"use client";

import { memo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import type { Transaction } from "@/types/transaction";

type TransactionCardProps = {
  transaction: Transaction;
};

function getStatusColor(status: Transaction["status"]) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "REFUNDED":
      return "warning" as const;
    case "VOIDED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

function formatTransactionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "--";
  }

  return `₱${amount.toFixed(2)}`;
}

const TransactionCard = memo(function TransactionCard({
  transaction,
}: TransactionCardProps) {
  const transactionItems = Array.isArray(transaction.items)
    ? transaction.items
    : [];
  const [expanded, setExpanded] = useState(false);
  const paidAmount = transaction.amountPaid ?? transaction.total;
  const change = Math.max(0, Number(paidAmount) - Number(transaction.total));
  const hasNote = Boolean(transaction.note?.trim());
  const itemCount = transactionItems.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 1.25,
            py: 1.1,
            background:
              "linear-gradient(180deg, rgba(25,118,210,0.06) 0%, rgba(25,118,210,0) 100%)",
          }}
        >
          <Stack spacing={1}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ minWidth: 0, flex: 1 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", letterSpacing: 0.4 }}
                  >
                    Transaction
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}
                  >
                    {transaction.orderNo}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  variant="filled"
                  color={getStatusColor(transaction.status)}
                  label={transaction.status}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <IconButton
                size="small"
                aria-label={
                  expanded
                    ? "collapse transaction details"
                    : "expand transaction details"
                }
                onClick={() => setExpanded((current) => !current)}
                sx={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                <KeyboardArrowDownRounded fontSize="small" />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="caption" color="text.secondary">
                {formatTransactionDate(transaction.createdAt)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />

          <Stack
            direction="row"
            spacing={1}
            sx={{ px: 1.25, py: 1.1 }}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
                {formatCurrency(transaction.total)}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Paid
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
                {formatCurrency(paidAmount)}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Change
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
                {formatCurrency(change)}
              </Typography>
            </Box>
          </Stack>

          <Divider />

          <Box sx={{ px: 1.25, py: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.75, letterSpacing: 0.3 }}
            >
              Items Bought
            </Typography>

            <Stack spacing={0.9}>
              {transactionItems.map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  justifyContent="space-between"
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Qty {item.quantity} x {formatCurrency(item.unitPrice)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(item.lineTotal)}
                  </Typography>
                </Stack>
              ))}

              {transactionItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No item details available.
                </Typography>
              ) : null}
            </Stack>
          </Box>

          {hasNote ? (
            <>
              <Divider />
              <Box sx={{ px: 1.25, py: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.35, letterSpacing: 0.3 }}
                >
                  Note
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.35 }}
                >
                  {transaction.note}
                </Typography>
              </Box>
            </>
          ) : null}
        </Collapse>
      </Card>
    </ListItem>
  );
});

export default TransactionCard;
