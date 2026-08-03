"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import PercentRounded from "@mui/icons-material/PercentRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import SendToMobileRounded from "@mui/icons-material/SendToMobileRounded";
import AppSnackbar from "@/app/components/app-snackbar";
import EWalletAmountInput from "@/app/components/ewallet-amount-input";
import EWalletFeeDialog from "@/app/components/ewallet-fee-dialog";
import EWalletProviderPicker from "@/app/components/ewallet-provider-picker";
import EWalletRecipientSection from "@/app/components/ewallet-recipient-section";
import EWalletSummaryCard from "@/app/components/ewallet-summary-card";
import SegmentedControl from "@/app/components/segmented-control";
import type { SegmentOption } from "@/app/components/segmented-control";
import QrCodeDialog from "@/app/components/qr-code-dialog";
import SmsRecipientDialog from "@/app/components/sms-recipient-dialog";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useEwalletCheckout } from "@/app/hooks/use-ewallet-checkout";
import { useEwalletFeeSettings } from "@/app/hooks/use-ewallet-fee-settings";
import { useQrCodes } from "@/app/hooks/use-qr-codes";
import { useSenderPushEndpoint } from "@/app/hooks/use-sender-push-endpoint";
import { useSmsRecipient } from "@/app/hooks/use-sms-recipient";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  EWALLET_DIRECTIONS,
  EWALLET_PROVIDERS,
  type EWalletDirection,
} from "@/lib/ewallet-catalog";

const DIRECTION_SEGMENTS: SegmentOption[] = EWALLET_DIRECTIONS.map(
  ({ direction, label }) => ({ key: direction, label }),
);

function providerLabel(provider: string) {
  return (
    EWALLET_PROVIDERS.find((entry) => entry.provider === provider)?.label ??
    provider
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

  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { settings: feeSettings, updateSettings: updateFeeSettings } =
    useEwalletFeeSettings();
  const { number: smsRecipient, updateNumber: updateSmsRecipient } =
    useSmsRecipient();
  const senderPushEndpointRef = useSenderPushEndpoint();
  const { qrCodeUrls, uploadQrCode } = useQrCodes();

  const {
    provider,
    setProvider,
    direction,
    setDirection,
    amountInput,
    setAmountInput,
    amountFocused,
    setAmountFocused,
    idMode,
    setIdMode,
    accountNumber,
    setAccountNumber,
    referenceNumber,
    setReferenceNumber,
    completing,
    sendingRequest,
    submitError,
    setSubmitError,
    amount,
    fee,
    isCashIn,
    busy,
    handleCancel,
    handleSendSms,
    handleComplete,
  } = useEwalletCheckout({
    addTransaction,
    showSnackbar,
    feeSettings,
    smsRecipient,
    senderPushEndpointRef,
    onMissingRecipient: () => setRecipientDialogOpen(true),
    providerLabel,
  });

  return (
    <MobilePageWrapper
      title="E-Wallet"
      pageMenuItems={(closeMenu) => [
        <MenuItem
          key="fee-settings"
          onClick={() => {
            closeMenu();
            setFeeDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <PercentRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Fee Settings</ListItemText>
        </MenuItem>,
        <MenuItem
          key="request-recipient"
          onClick={() => {
            closeMenu();
            setRecipientDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <SendToMobileRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Request Recipient</ListItemText>
        </MenuItem>,
        <MenuItem
          key="qr-codes"
          onClick={() => {
            closeMenu();
            setQrDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <QrCode2Rounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cash-Out QR Codes</ListItemText>
        </MenuItem>,
      ]}
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1}>
          {submitError ? (
            <Alert severity="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          ) : null}

          <EWalletProviderPicker value={provider} onChange={setProvider} />

          <Stack spacing={1}>
            <SegmentedControl
              ariaLabel="e-wallet direction"
              segments={DIRECTION_SEGMENTS}
              selectedKeys={[direction]}
              onSelect={(key) => setDirection(key as EWalletDirection)}
            />
          </Stack>

          <EWalletRecipientSection
            isCashIn={isCashIn}
            providerLabel={providerLabel(provider)}
            idMode={idMode}
            onIdModeChange={setIdMode}
            accountNumber={accountNumber}
            onAccountNumberChange={setAccountNumber}
            referenceNumber={referenceNumber}
            onReferenceNumberChange={setReferenceNumber}
            qrCodeUrl={qrCodeUrls[provider]}
            onUploadQrClick={() => setQrDialogOpen(true)}
          />

          <EWalletAmountInput
            label={isCashIn ? "Amount to send" : "Amount to hand customer"}
            amount={amount}
            amountInput={amountInput}
            amountFocused={amountFocused}
            onAmountInputChange={setAmountInput}
            onFocusChange={setAmountFocused}
          />

          {amount > 0 ? (
            <EWalletSummaryCard isCashIn={isCashIn} amount={amount} fee={fee} />
          ) : null}

          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              disabled={amount <= 0 || busy}
              onClick={handleComplete}
            >
              {completing ? "Saving..." : "Mark Completed"}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="info"
              disabled={amount <= 0 || busy}
              onClick={handleSendSms}
            >
              {sendingRequest ? "Sending..." : "Send Request"}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              disabled={busy}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Container>

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
