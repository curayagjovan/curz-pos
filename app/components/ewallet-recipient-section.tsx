"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DialpadRounded from "@mui/icons-material/DialpadRounded";
import NumbersRounded from "@mui/icons-material/NumbersRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import FilterPopoverButton from "@/app/components/filter-popover-button";
import type { FilterPopoverOption } from "@/app/components/filter-popover-button";
import type { EWalletIdMode } from "@/lib/ewallet-catalog";

const ID_MODE_OPTIONS: FilterPopoverOption[] = [
  { key: "mobile", label: "Mobile No.", icon: DialpadRounded },
  { key: "reference", label: "Reference No.", icon: NumbersRounded },
];

type EWalletRecipientSectionProps = {
  isCashIn: boolean;
  providerLabel: string;
  idMode: EWalletIdMode;
  onIdModeChange: (mode: EWalletIdMode) => void;
  accountNumber: string;
  onAccountNumberChange: (value: string) => void;
  referenceNumber: string;
  onReferenceNumberChange: (value: string) => void;
  qrCodeUrl?: string | null;
  onUploadQrClick: () => void;
};

export default function EWalletRecipientSection({
  isCashIn,
  providerLabel,
  idMode,
  onIdModeChange,
  accountNumber,
  onAccountNumberChange,
  referenceNumber,
  onReferenceNumberChange,
  qrCodeUrl,
  onUploadQrClick,
}: EWalletRecipientSectionProps) {
  if (isCashIn) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          Recipient
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {idMode === "mobile" ? (
              <TextField
                fullWidth
                value={accountNumber}
                placeholder="Mobile number"
                onChange={(event) => onAccountNumberChange(event.target.value)}
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
                  onReferenceNumberChange(event.target.value)
                }
              />
            )}
          </Box>
          <Divider orientation="vertical" sx={{ height: 30 }} />
          <FilterPopoverButton
            ariaLabel="cash-in identifier"
            options={ID_MODE_OPTIONS}
            selectedKeys={[idMode]}
            onSelect={(key) => onIdModeChange(key as EWalletIdMode)}
            showActiveBadge={false}
            outlined
          />
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {qrCodeUrl ? (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box
            component="img"
            src={qrCodeUrl}
            alt={`${providerLabel} cash-out QR code`}
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
          onClick={onUploadQrClick}
        >
          Upload {providerLabel} QR for customers to scan
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
          onChange={(event) => onReferenceNumberChange(event.target.value)}
        />
      </Stack>
    </Stack>
  );
}
