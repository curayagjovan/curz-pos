"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { useAppUpdate } from "@/app/hooks/use-app-update";

const APP_HEADER_HEIGHT = 56;

export default function AppUpdateBanner() {
  const { updateAvailable, applyUpdate } = useAppUpdate();

  return (
    <Snackbar
      open={updateAvailable}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 3,
        top: `calc(env(safe-area-inset-top) + ${APP_HEADER_HEIGHT}px + 12px)`,
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{ width: "100%", alignItems: "center" }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={applyUpdate}
            sx={{ fontWeight: 700 }}
          >
            Update
          </Button>
        }
      >
        A new version is available
      </Alert>
    </Snackbar>
  );
}
