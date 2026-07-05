"use client";

import { useCallback, useState } from "react";
import type { AlertColor } from "@mui/material/Alert";

type ShowSnackbarOptions = {
  message: string;
  severity?: AlertColor;
};

export function useAppSnackbar(defaultSeverity: AlertColor = "success") {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<AlertColor>(defaultSeverity);

  const showSnackbar = useCallback(
    ({ message, severity = defaultSeverity }: ShowSnackbarOptions) => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
    },
    [defaultSeverity],
  );

  const closeSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  };
}
