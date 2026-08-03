import { useState } from "react";
import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";
import { getSellPrice, type LoadMarkupSettings } from "@/lib/load-markup";
import { buildLoadMessage } from "@/lib/load-message";
import { buildSmsHref } from "@/lib/sms-link";
import { normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";

type ShowSnackbar = (options: {
  message: string;
  severity?: "success" | "info" | "warning" | "error";
}) => void;

type UseLoadCheckoutParams = {
  addTransaction: (transaction: Transaction) => void;
  showSnackbar: ShowSnackbar;
  markupSettings: LoadMarkupSettings;
  smsRecipient: string | null;
  senderPushEndpointRef: React.RefObject<string | undefined>;
  onMissingRecipient: () => void;
  brandLabel: (brand: LoadCatalogItem["brand"]) => string;
};

// Owns the load-confirm drawer's state (which item is selected, the
// recipient number to confirm) plus both submit paths — "Send Request"
// (records the sale as PENDING, sent via SMS) and "Complete" (records it as
// PAID immediately) — since they share the request payload shape.
export function useLoadCheckout({
  addTransaction,
  showSnackbar,
  markupSettings,
  smsRecipient,
  senderPushEndpointRef,
  onMissingRecipient,
  brandLabel,
}: UseLoadCheckoutParams) {
  const [selectedItem, setSelectedItem] = useState<LoadCatalogItem | null>(
    null,
  );
  const [confirmNumber, setConfirmNumber] = useState("");
  const [completing, setCompleting] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSelectItem = (item: LoadCatalogItem, mobileNumber: string) => {
    setSelectedItem(item);
    setConfirmNumber(mobileNumber);
  };

  const handleCloseConfirm = () => {
    if (completing || sendingRequest) {
      return;
    }
    setSelectedItem(null);
  };

  // Shared by "Send Request" (records the sale as PENDING — the load is
  // requested via SMS but not yet paid for) and "Completed" (records it as
  // PAID immediately). Only the resulting order status differs.
  const submitLoadSale = async (
    status: "PENDING" | "PAID",
  ): Promise<Transaction | null> => {
    if (!selectedItem) {
      return null;
    }

    const setLoading = status === "PAID" ? setCompleting : setSendingRequest;
    setLoading(true);
    setSubmitError(null);

    try {
      // The recorded sale is the load's face value plus the markup — the
      // face value still passes through the till as real cash collected, so
      // it belongs in the sale total alongside the markup that's the actual
      // profit.
      const sellPrice = getSellPrice(selectedItem.amount, markupSettings);
      const requestId = crypto.randomUUID();
      // The line item's price already covers the face value, so it's folded
      // into the name itself (unless the catalog label already states it,
      // e.g. "Regular Load ₱50").
      const productName = selectedItem.label.includes("₱")
        ? selectedItem.label
        : `${selectedItem.label} ₱${selectedItem.amount.toFixed(2)}`;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status,
          senderPushEndpoint: senderPushEndpointRef.current,
          ...(status === "PAID" ? { amountPaid: sellPrice } : {}),
          note: `Mobile Load ${brandLabel(selectedItem.brand)} ₱${sellPrice} -> ${confirmNumber}`,
          items: [
            {
              productId: selectedItem.id,
              productName,
              quantity: 1,
              unitPrice: sellPrice,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            (status === "PAID"
              ? "Unable to record load sale"
              : "Unable to record pending load sale"),
        );
      }

      const savedTransaction = data as Partial<Transaction>;
      if (
        !savedTransaction ||
        typeof savedTransaction.id !== "string" ||
        typeof savedTransaction.orderNo !== "string" ||
        !Array.isArray(savedTransaction.items)
      ) {
        throw new Error(
          status === "PAID"
            ? "Sale not yet confirmed. Please try again."
            : "Request not yet confirmed. Please try again.",
        );
      }

      addTransaction(savedTransaction as Transaction);
      return savedTransaction as Transaction;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : status === "PAID"
            ? "Unable to record load sale"
            : "Unable to record pending load sale";
      // The toast alone is easy to miss if you looked away right as it
      // submitted — persisted here too so the failure stays visible.
      setSubmitError(message);
      showSnackbar({ message, severity: "error" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSendSms = async () => {
    if (!selectedItem) {
      return;
    }

    const digits = normalizeMobileNumber(confirmNumber);
    if (digits.length < 10) {
      showSnackbar({
        message: "Enter a valid mobile number",
        severity: "error",
      });
      return;
    }

    if (!smsRecipient) {
      onMissingRecipient();
      showSnackbar({
        message: "Set the request recipient number first",
        severity: "info",
      });
      return;
    }

    const savedTransaction = await submitLoadSale("PENDING");
    if (!savedTransaction) {
      return;
    }

    showSnackbar({
      message: `Order ${savedTransaction.orderNo} recorded as pending — payment not yet received`,
      severity: "info",
    });

    const message = buildLoadMessage(selectedItem, confirmNumber);
    window.location.href = buildSmsHref(smsRecipient, message);
    setSelectedItem(null);
  };

  const handleComplete = async () => {
    if (!selectedItem) {
      return;
    }

    const digits = normalizeMobileNumber(confirmNumber);
    if (digits.length < 10) {
      showSnackbar({
        message: "Enter a valid mobile number",
        severity: "error",
      });
      return;
    }

    const savedTransaction = await submitLoadSale("PAID");
    if (!savedTransaction) {
      return;
    }

    showSnackbar({ message: `Order ${savedTransaction.orderNo} completed` });
    setSelectedItem(null);
  };

  return {
    selectedItem,
    confirmNumber,
    setConfirmNumber,
    completing,
    sendingRequest,
    submitError,
    setSubmitError,
    handleSelectItem,
    handleCloseConfirm,
    handleSendSms: () => void handleSendSms(),
    handleComplete: () => void handleComplete(),
  };
}
