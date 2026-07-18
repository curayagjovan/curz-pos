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
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import SendToMobileRounded from "@mui/icons-material/SendToMobileRounded";
import AppSnackbar from "@/app/components/app-snackbar";
import EWalletConfirmDrawer from "@/app/components/ewallet-confirm-drawer";
import EWalletFeeDialog from "@/app/components/ewallet-fee-dialog";
import SegmentedControl from "@/app/components/segmented-control";
import type { SegmentOption } from "@/app/components/segmented-control";
import QrCodeDialog from "@/app/components/qr-code-dialog";
import SmsRecipientDialog from "@/app/components/sms-recipient-dialog";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useEwalletFeeSettings } from "@/app/hooks/use-ewallet-fee-settings";
import { useQrCodes } from "@/app/hooks/use-qr-codes";
import { useSenderPushEndpoint } from "@/app/hooks/use-sender-push-endpoint";
import { useSmsRecipient } from "@/app/hooks/use-sms-recipient";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  EWALLET_DIRECTIONS,
  EWALLET_PROVIDERS,
  findEwalletCatalogEntry,
  type EWalletDirection,
  type EWalletIdMode,
  type EWalletProvider,
} from "@/lib/ewallet-catalog";
import { getFeeForAmount } from "@/lib/ewallet-fee";
import { buildEwalletMessage } from "@/lib/ewallet-message";
import { buildSmsHref } from "@/lib/sms-link";
import { normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";
import InputAdornment from "@mui/material/InputAdornment";
import DialpadRounded from "@mui/icons-material/DialpadRounded";

const PROVIDER_SEGMENTS: SegmentOption[] = EWALLET_PROVIDERS.map(
  ({ provider, label }) => ({ key: provider, label }),
);

const DIRECTION_SEGMENTS: SegmentOption[] = EWALLET_DIRECTIONS.map(
  ({ direction, label }) => ({ key: direction, label }),
);

const ID_MODE_SEGMENTS: SegmentOption[] = [
  { key: "mobile", label: "Mobile No." },
  { key: "reference", label: "Reference No." },
];

function providerLabel(provider: EWalletProvider) {
  return (
    EWALLET_PROVIDERS.find((entry) => entry.provider === provider)?.label ??
    provider
  );
}

function directionLabel(direction: EWalletDirection) {
  return (
    EWALLET_DIRECTIONS.find((entry) => entry.direction === direction)?.label ??
    direction
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
  const [idMode, setIdMode] = useState<EWalletIdMode>("mobile");
  const [accountNumber, setAccountNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [confirmReferenceNumber, setConfirmReferenceNumber] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [settingsMenuAnchor, setSettingsMenuAnchor] =
    useState<HTMLElement | null>(null);
  const { settings: feeSettings, updateSettings: updateFeeSettings } =
    useEwalletFeeSettings();
  const { number: smsRecipient, updateNumber: updateSmsRecipient } =
    useSmsRecipient();
  const senderPushEndpointRef = useSenderPushEndpoint();
  const { qrCodeUrls, uploadQrCode } = useQrCodes();

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
    setConfirmReferenceNumber(referenceNumber);
    setConfirmOpen(true);
  };

  const validateIdentifier = () => {
    if (!isCashIn) {
      return true;
    }
    if (idMode === "mobile") {
      const digits = normalizeMobileNumber(confirmAccountNumber);
      if (digits.length < 10) {
        showSnackbar({
          message: "Enter a valid mobile number",
          severity: "error",
        });
        return false;
      }
      return true;
    }
    if (confirmReferenceNumber.trim().length < 6) {
      showSnackbar({
        message: "Enter a valid reference number",
        severity: "error",
      });
      return false;
    }
    return true;
  };

  const handleCloseConfirm = () => {
    if (completing) {
      return;
    }
    setConfirmOpen(false);
  };

  const handleSendSms = () => {
    if (!validateIdentifier()) {
      return;
    }

    if (!smsRecipient) {
      setRecipientDialogOpen(true);
      showSnackbar({
        message: "Set the request recipient number first",
        severity: "info",
      });
      return;
    }

    const message = buildEwalletMessage(
      providerLabel(provider),
      direction,
      amount,
      isCashIn && idMode === "mobile"
        ? { accountNumber: confirmAccountNumber }
        : { referenceNumber: confirmReferenceNumber },
    );
    window.location.href = buildSmsHref(smsRecipient, message);
  };

  const handleComplete = async () => {
    if (!validateIdentifier()) {
      return;
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
      const refText = confirmReferenceNumber.trim();
      const identifierText =
        isCashIn && idMode === "mobile"
          ? ` to ${confirmAccountNumber}`
          : refText
            ? ` (Ref ${refText})`
            : "";
      const note = `${providerLabel(provider)} ${isCashIn ? "Cash In" : "Cash Out"} ₱${amount.toFixed(2)}${identifierText} (fee ₱${fee.toFixed(2)})`;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "PAID",
          senderPushEndpoint: senderPushEndpointRef.current,
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
        throw new Error(
          data?.message || "Unable to record e-wallet transaction",
        );
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
      setReferenceNumber("");
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
            <MenuItem
              onClick={() => {
                setSettingsMenuAnchor(null);
                setRecipientDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <SendToMobileRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Request Recipient</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSettingsMenuAnchor(null);
                setQrDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <QrCode2Rounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Cash-Out QR Codes</ListItemText>
            </MenuItem>
          </Menu>
        </>
      }
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={2}>
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
            {isCashIn ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recipient
                </Typography>
                <SegmentedControl
                  ariaLabel="cash-in identifier"
                  segments={ID_MODE_SEGMENTS}
                  selectedKeys={[idMode]}
                  onSelect={(key) => setIdMode(key as EWalletIdMode)}
                />
                {idMode === "mobile" ? (
                  <TextField
                    fullWidth
                    value={accountNumber}
                    placeholder="Mobile number"
                    onChange={(event) => setAccountNumber(event.target.value)}
                    slotProps={{
                      htmlInput: {
                        inputMode: "tel",
                      },
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <DialpadRounded
                              fontSize="small"
                              sx={{ color: "text.secondary" }}
                            />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    value={referenceNumber}
                    placeholder="Reference number from the app"
                    onChange={(event) =>
                      setReferenceNumber(event.target.value)
                    }
                  />
                )}
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                {qrCodeUrls[provider] ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      component="img"
                      src={qrCodeUrls[provider] as string}
                      alt={`${providerLabel(provider)} cash-out QR code`}
                      sx={{
                        width: "100%",
                        maxWidth: 300,
                        borderRadius: 3,
                        boxShadow:
                          "0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)",
                      }}
                    />
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<QrCode2Rounded fontSize="small" />}
                    onClick={() => setQrDialogOpen(true)}
                  >
                    Upload {providerLabel(provider)} QR for customers to scan
                  </Button>
                )}
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reference number (optional)
                  </Typography>
                  <TextField
                    fullWidth
                    value={referenceNumber}
                    placeholder="Reference number from the app"
                    onChange={(event) =>
                      setReferenceNumber(event.target.value)
                    }
                  />
                </Stack>
              </Stack>
            )}
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
        idMode={idMode}
        accountNumber={confirmAccountNumber}
        referenceNumber={confirmReferenceNumber}
        completing={completing}
        onClose={handleCloseConfirm}
        onAccountNumberChange={setConfirmAccountNumber}
        onReferenceNumberChange={setConfirmReferenceNumber}
        onSendSms={handleSendSms}
        onComplete={() => void handleComplete()}
      />

      <EWalletFeeDialog
        open={feeDialogOpen}
        settings={feeSettings}
        onClose={() => setFeeDialogOpen(false)}
        onSave={updateFeeSettings}
      />

      <SmsRecipientDialog
        open={recipientDialogOpen}
        number={smsRecipient}
        onClose={() => setRecipientDialogOpen(false)}
        onSave={updateSmsRecipient}
      />

      <QrCodeDialog
        open={qrDialogOpen}
        qrCodeUrls={qrCodeUrls}
        onClose={() => setQrDialogOpen(false)}
        onUpload={uploadQrCode}
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
