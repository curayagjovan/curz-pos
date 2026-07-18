"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UploadRounded from "@mui/icons-material/UploadRounded";
import { EWALLET_PROVIDERS, type EWalletProvider } from "@/lib/ewallet-catalog";
import type { QrCodeUrls } from "@/app/hooks/use-qr-codes";

type QrCodeDialogProps = {
  open: boolean;
  qrCodeUrls: QrCodeUrls;
  onClose: () => void;
  onUpload: (provider: EWalletProvider, file: File) => Promise<void>;
};

export default function QrCodeDialog({
  open,
  qrCodeUrls,
  onClose,
  onUpload,
}: QrCodeDialogProps) {
  const [uploadingProvider, setUploadingProvider] =
    useState<EWalletProvider | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange =
    (provider: EWalletProvider) =>
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }

      setUploadingProvider(provider);
      setUploadError(null);

      try {
        await onUpload(provider, file);
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : "Unable to upload QR code",
        );
      } finally {
        setUploadingProvider(null);
      }
    };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Cash-Out QR Codes</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Upload a screenshot of each wallet&apos;s receive-money QR. It is
            shown on the Cash Out screen for customers to scan.
          </Typography>

          {EWALLET_PROVIDERS.map(({ provider, label }) => {
            const url = qrCodeUrls[provider];
            const uploading = uploadingProvider === provider;

            return (
              <Stack
                key={provider}
                direction="row"
                spacing={1.5}
                alignItems="center"
              >
                {url ? (
                  <Box
                    component="img"
                    src={url}
                    alt={`${label} QR code`}
                    sx={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      None
                    </Typography>
                  </Box>
                )}

                <Stack sx={{ flex: 1 }} spacing={0.25}>
                  <Typography variant="subtitle2">{label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {url ? "Uploaded" : "Not uploaded yet"}
                  </Typography>
                </Stack>

                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<UploadRounded fontSize="small" />}
                  disabled={uploadingProvider !== null}
                >
                  {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) =>
                      void handleFileChange(provider)(event)
                    }
                  />
                </Button>
              </Stack>
            );
          })}

          {uploadError ? (
            <Typography variant="caption" color="error">
              {uploadError}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={uploadingProvider !== null}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
