"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useConnectivity } from "@/app/hooks/use-connectivity";

const APP_HEADER_HEIGHT = 56;

export default function ConnectivityBanner() {
  const isOnline = useConnectivity();

  return (
    <Snackbar
      open={!isOnline}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 3,
        top: `calc(env(safe-area-inset-top) + ${APP_HEADER_HEIGHT}px + 12px)`,
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
      }}
    >
      <Alert
        severity="warning"
        variant="filled"
        sx={{ width: "100%", alignItems: "center" }}
      >
        You&apos;re offline — showing saved data
      </Alert>
    </Snackbar>
  );
}
