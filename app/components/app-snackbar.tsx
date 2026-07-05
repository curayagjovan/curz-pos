"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import type { AlertColor } from "@mui/material/Alert";

type AppSnackbarProps = {
  open: boolean;
  message: string;
  severity?: AlertColor;
  autoHideDuration?: number;
  onClose: () => void;
};

const APP_HEADER_HEIGHT = 56;

export default function AppSnackbar({
  open,
  message,
  severity = "success",
  autoHideDuration = 2800,
  onClose,
}: AppSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 2,
        top: `calc(env(safe-area-inset-top) + ${APP_HEADER_HEIGHT}px + 12px)`,
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
      }}
      onClose={onClose}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%", alignItems: "center" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
