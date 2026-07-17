"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import PercentRounded from "@mui/icons-material/PercentRounded";
import AppSnackbar from "@/app/components/app-snackbar";
import EWalletConfirmDrawer from "@/app/components/ewallet-confirm-drawer";
import EWalletFeeDialog from "@/app/components/ewallet-fee-dialog";
import SegmentedControl from "@/app/components/segmented-control";
import type { SegmentOption } from "@/app/components/segmented-control";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useEwalletFeeSettings } from "@/app/hooks/use-ewallet-fee-settings";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  EWALLET_DIRECTIONS,
  EWALLET_PROVIDERS,
  findEwalletCatalogEntry,
  type EWalletDirection,
  type EWalletProvider,
} from "@/lib/ewallet-catalog";
import { getFeeForAmount } from "@/lib/ewallet-fee";
import { buildEwalletMessage } from "@/lib/ewallet-message";
import {
  LoadRequestShareCancelledError,
  shareLoadRequest,
} from "@/lib/load-message";
import { normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";

const PROVIDER_SEGMENTS: SegmentOption[] = EWALLET_PROVIDERS.map(
  ({ provider, label }) => ({ key: provider, label }),
);

const DIRECTION_SEGMENTS: SegmentOption[] = EWALLET_DIRECTIONS.map(
  ({ direction, label }) => ({ key: direction, label }),
);

function providerLabel(provider: EWalletProvider) {
  return (
    EWALLET_PROVIDERS.find((entry) => entry.provider === provider)?.label ??
    provider
  );
}

function directionLabel(direction: EWalletDirection) {
  return (
    EWALLET_DIRECTIONS.find((entry) => entry.direction === direction)
      ?.label ?? direction
  );
}

export default function EWalletPage() {
  const { addTransaction } = useTransactions();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();

  const [provider, setProvider] = useState<EWalletProvider>("GCASH");
  const [direction, setDirection] = useState<EWalletDirection>("CASH_IN");
  const [amountInput, setAmountInput] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [settingsMenuAnchor, setSettingsMenuAnchor] =
    useState<HTMLElement | null>(null);
  const { settings: feeSettings, updateSettings: updateFeeSettings } =
    useEwalletFeeSettings();

  const amount = Number(amountInput) || 0;
  const fee = useMemo(
    () => (amount > 0 ? getFeeForAmount(amount, feeSettings) : 0),
    [amount, feeSettings],
  );
  const isCashIn = direction === "CASH_IN";

  const handleOpenConfirm = () => {
    if (amount <= 0) {
      showSnackbar({ message: "Enter a valid amount", severity: "error" });
      return;
    }
    setConfirmAccountNumber(accountNumber);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    if (sharing || completing) {
      return;
    }
    setConfirmOpen(false);
  };

  const handleShare = async () => {
    if (isCashIn) {
      const digits = normalizeMobileNumber(confirmAccountNumber);
      if (digits.length < 10) {
        showSnackbar({
          message: "Enter a valid mobile number",
          severity: "error",
        });
        return;
      }
    }

    setSharing(true);

    try {
      const message = buildEwalletMessage(
        providerLabel(provider),
        direction,
        amount,
        isCashIn ? confirmAccountNumber : undefined,
      );
      const shareResult = await shareLoadRequest(message);

      if (shareResult === "copied") {
        showSnackbar({
          message:
            "Sharing isn't supported on this device. Request copied instead.",
          severity: "info",
        });
      }
    } catch (error) {
      if (error instanceof LoadRequestShareCancelledError) {
        return;
      }

      showSnackbar({
        message:
          error instanceof Error ? error.message : "Unable to share request",
        severity: "error",
      });
    } finally {
      setSharing(false);
    }
  };

  const handleComplete = async () => {
    if (isCashIn) {
      const digits = normalizeMobileNumber(confirmAccountNumber);
      if (digits.length < 10) {
        showSnackbar({
          message: "Enter a valid mobile number",
          severity: "error",
        });
        return;
      }
    }

    const entry = findEwalletCatalogEntry(provider, direction);
    if (!entry) {
      showSnackbar({
        message: "Unable to resolve e-wallet product",
        severity: "error",
      });
      return;
    }

    setCompleting(true);

    try {
      const unitPrice = isCashIn ? amount + fee : fee;
      const requestId = crypto.randomUUID();
      const note = isCashIn
        ? `${providerLabel(provider)} Cash In ₱${amount.toFixed(2)} to ${confirmAccountNumber} (fee ₱${fee.toFixed(2)})`
        : `${providerLabel(provider)} Cash Out ₱${amount.toFixed(2)} (fee ₱${fee.toFixed(2)})`;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "PAID",
          amountPaid: unitPrice,
          note,
          items: [
            {
              productId: entry.id,
              productName: entry.label,
              quantity: 1,
              unitPrice,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to record e-wallet transaction");
      }

      const savedTransaction = data as Partial<Transaction>;
      if (
        savedTransaction &&
        typeof savedTransaction.id === "string" &&
        Array.isArray(savedTransaction.items)
      ) {
        addTransaction(savedTransaction as Transaction);
      }

      setConfirmOpen(false);
      setAmountInput("");
      setAccountNumber("");
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "Unable to record e-wallet transaction",
        severity: "error",
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <MobilePageWrapper
      title="E-Wallet"
      headerActions={
        <>
          <IconButton
            onClick={(event) => setSettingsMenuAnchor(event.currentTarget)}
            aria-label="e-wallet settings"
            aria-haspopup="menu"
            aria-expanded={Boolean(settingsMenuAnchor)}
          >
            <SettingsRounded fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={settingsMenuAnchor}
            open={Boolean(settingsMenuAnchor)}
            onClose={() => setSettingsMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setSettingsMenuAnchor(null);
                setFeeDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <PercentRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Fee Settings</ListItemText>
            </MenuItem>
          </Menu>
        </>
      }
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={2}>
          {isCashIn ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Recipient mobile number
              </Typography>
              <TextField
                fullWidth
                value={accountNumber}
                placeholder="09XXXXXXXXX"
                onChange={(event) => setAccountNumber(event.target.value)}
                slotProps={{
                  htmlInput: {
                    inputMode: "tel",
                  },
                }}
              />
            </Stack>
          ) : null}

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Provider
            </Typography>
            <SegmentedControl
              ariaLabel="e-wallet provider"
              segments={PROVIDER_SEGMENTS}
              selectedKeys={[provider]}
              onSelect={(key) => setProvider(key as EWalletProvider)}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Transaction
            </Typography>
            <SegmentedControl
              ariaLabel="e-wallet direction"
              segments={DIRECTION_SEGMENTS}
              selectedKeys={[direction]}
              onSelect={(key) => setDirection(key as EWalletDirection)}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Amount
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={amountInput}
              placeholder="0.00"
              onChange={(event) => setAmountInput(event.target.value)}
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.01",
                  inputMode: "decimal",
                },
              }}
            />
          </Stack>

          {amount > 0 ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
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
                  <Typography sx={{ fontWeight: 700 }}>
                    {isCashIn ? "Customer pays" : "Recorded as sale"}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    ₱{(isCashIn ? amount + fee : fee).toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ) : null}

          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={amount <= 0}
            onClick={handleOpenConfirm}
          >
            Complete Transaction
          </Button>
        </Stack>
      </Container>

      <EWalletConfirmDrawer
        open={confirmOpen}
        provider={provider}
        providerLabel={providerLabel(provider)}
        direction={direction}
        directionLabel={directionLabel(direction)}
        amount={amount}
        fee={fee}
        accountNumber={confirmAccountNumber}
        sharing={sharing}
        completing={completing}
        onClose={handleCloseConfirm}
        onAccountNumberChange={setConfirmAccountNumber}
        onShare={() => void handleShare()}
        onComplete={() => void handleComplete()}
      />

      <EWalletFeeDialog
        open={feeDialogOpen}
        settings={feeSettings}
        onClose={() => setFeeDialogOpen(false)}
        onSave={updateFeeSettings}
      />

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
      />
    </MobilePageWrapper>
  );
}
