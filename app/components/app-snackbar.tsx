"use client";

import { useEffect, useRef, useState } from "react";
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
// Pages under the app bar (products, inventory, load) stack a second sticky
// row — search bar + filter chips — right below it. Clearing past that row
// (rather than just the app bar) keeps the toast from landing on top of it.
const STICKY_SUBHEADER_CLEARANCE = 72;

export default function AppSnackbar({
  open,
  message,
  severity = "success",
  autoHideDuration = 2800,
  onClose,
}: AppSnackbarProps) {
  // The parent only tracks one open/message/severity slot, so calling
  // showSnackbar() again while a toast is already showing (e.g. "Saving
  // checkout..." immediately followed by "Order completed") swaps this
  // component's props without `open` ever going false — which would just
  // flash the new color in place. Mirror the props into local state and,
  // when the message changes while already open, close first and let
  // `onExited` bring the new one in, so it reads as one toast replacing
  // another instead of an abrupt color swap.
  const [displayOpen, setDisplayOpen] = useState(open);
  const [display, setDisplay] = useState({ message, severity });
  const pendingRef = useRef<{ message: string; severity: AlertColor } | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      setDisplayOpen(false);
      return;
    }

    if (!displayOpen) {
      setDisplay({ message, severity });
      setDisplayOpen(true);
      return;
    }

    if (message !== display.message || severity !== display.severity) {
      pendingRef.current = { message, severity };
      setDisplayOpen(false);
    }
    // displayOpen/display intentionally excluded — they're only read here to
    // decide the transition, not to retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, message, severity]);

  const handleExited = () => {
    if (pendingRef.current) {
      const next = pendingRef.current;
      pendingRef.current = null;
      setDisplay(next);
      setDisplayOpen(true);
    }
  };

  return (
    <Snackbar
      open={displayOpen}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{ transition: { onExited: handleExited } }}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 2,
        top: `calc(env(safe-area-inset-top) + ${APP_HEADER_HEIGHT}px + ${STICKY_SUBHEADER_CLEARANCE}px)`,
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
      }}
      onClose={onClose}
    >
      <Alert
        onClose={onClose}
        severity={display.severity}
        variant="filled"
        sx={{ width: "100%", alignItems: "center" }}
      >
        {display.message}
      </Alert>
    </Snackbar>
  );
}
