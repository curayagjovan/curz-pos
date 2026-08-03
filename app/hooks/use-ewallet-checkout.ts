import { useMemo, useState } from "react";
import {
  findEwalletCatalogEntry,
  type EWalletDirection,
  type EWalletIdMode,
  type EWalletProvider,
} from "@/lib/ewallet-catalog";
import type { EWalletFeeSettings } from "@/lib/ewallet-fee";
import { getFeeForAmount } from "@/lib/ewallet-fee";
import { buildEwalletMessage } from "@/lib/ewallet-message";
import { buildSmsHref } from "@/lib/sms-link";
import { normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";

type ShowSnackbar = (options: {
  message: string;
  severity?: "success" | "info" | "warning" | "error";
}) => void;

type UseEwalletCheckoutParams = {
  addTransaction: (transaction: Transaction) => void;
  showSnackbar: ShowSnackbar;
  feeSettings: EWalletFeeSettings;
  smsRecipient: string | null;
  senderPushEndpointRef: React.RefObject<string | undefined>;
  onMissingRecipient: () => void;
  providerLabel: (provider: EWalletProvider) => string;
};

// Owns every piece of state for the e-wallet form (provider/direction,
// amount, recipient identifier) plus both submit paths — "Send Request"
// (records the sale as PENDING, sent via SMS) and "Mark Completed" (records
// it as PAID immediately) — since they share validation and the request
// payload shape.
export function useEwalletCheckout({
  addTransaction,
  showSnackbar,
  feeSettings,
  smsRecipient,
  senderPushEndpointRef,
  onMissingRecipient,
  providerLabel,
}: UseEwalletCheckoutParams) {
  const [provider, setProvider] = useState<EWalletProvider>("GCASH");
  const [direction, setDirection] = useState<EWalletDirection>("CASH_IN");
  const [amountInput, setAmountInput] = useState("");
  const [amountFocused, setAmountFocused] = useState(false);
  const [idMode, setIdMode] = useState<EWalletIdMode>("mobile");
  const [accountNumber, setAccountNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [completing, setCompleting] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amount = Number(amountInput) || 0;
  const fee = useMemo(
    () => (amount > 0 ? getFeeForAmount(amount, feeSettings) : 0),
    [amount, feeSettings],
  );
  const isCashIn = direction === "CASH_IN";
  const busy = completing || sendingRequest;

  const validateAmount = () => {
    if (amount <= 0) {
      showSnackbar({ message: "Enter a valid amount", severity: "error" });
      return false;
    }
    return true;
  };

  const validateIdentifier = () => {
    if (!isCashIn) {
      return true;
    }
    if (idMode === "mobile") {
      const digits = normalizeMobileNumber(accountNumber);
      if (digits.length < 10) {
        showSnackbar({
          message: "Enter a valid mobile number",
          severity: "error",
        });
        return false;
      }
      return true;
    }
    if (referenceNumber.trim().length < 6) {
      showSnackbar({
        message: "Enter a valid reference number",
        severity: "error",
      });
      return false;
    }
    return true;
  };

  const handleCancel = () => {
    setAmountInput("");
    setAccountNumber("");
    setReferenceNumber("");
  };

  // Shared by "Send Request" (records the sale as PENDING — the request is
  // sent via SMS but not yet paid for) and "Mark Completed" (records it as
  // PAID immediately). Only the resulting order status differs.
  const submitEwalletSale = async (
    status: "PENDING" | "PAID",
  ): Promise<Transaction | null> => {
    const entry = findEwalletCatalogEntry(provider, direction);
    if (!entry) {
      showSnackbar({
        message: "Unable to resolve e-wallet product",
        severity: "error",
      });
      return null;
    }

    const setLoading = status === "PAID" ? setCompleting : setSendingRequest;
    setLoading(true);
    setSubmitError(null);

    try {
      // The recorded sale is the transacted amount plus the service fee —
      // the amount still moves through the till as real cash (in on a
      // cash-in, out on a cash-out), so it belongs in the sale total
      // alongside the fee that's the actual profit.
      const unitPrice = amount + fee;
      const requestId = crypto.randomUUID();
      const refText = referenceNumber.trim();
      const identifierText =
        isCashIn && idMode === "mobile"
          ? ` to ${accountNumber}`
          : refText
            ? ` (Ref ${refText})`
            : "";
      const note = `${providerLabel(provider)} ${isCashIn ? "Cash In" : "Cash Out"} ₱${amount.toFixed(2)}${identifierText} (fee ₱${fee.toFixed(2)})`;
      // The line item only carries the fee as its price, so the transacted
      // amount is folded into the name itself (e.g. "GCash Cash In ₱200.00")
      // — otherwise it would only be visible inside the free-text note.
      const productName = `${entry.label} ₱${amount.toFixed(2)}`;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status,
          senderPushEndpoint: senderPushEndpointRef.current,
          ...(status === "PAID" ? { amountPaid: unitPrice } : {}),
          note,
          items: [
            {
              productId: entry.id,
              productName,
              quantity: 1,
              unitPrice,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            (status === "PAID"
              ? "Unable to record e-wallet transaction"
              : "Unable to record pending e-wallet transaction"),
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
            ? "Transaction not yet confirmed. Please try again."
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
            ? "Unable to record e-wallet transaction"
            : "Unable to record pending e-wallet transaction";
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
    if (!validateAmount() || !validateIdentifier()) {
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

    const savedTransaction = await submitEwalletSale("PENDING");
    if (!savedTransaction) {
      return;
    }

    showSnackbar({
      message: `Order ${savedTransaction.orderNo} recorded as pending — payment not yet received`,
      severity: "info",
    });

    const message = buildEwalletMessage(
      providerLabel(provider),
      direction,
      amount,
      isCashIn && idMode === "mobile" ? { accountNumber } : { referenceNumber },
    );
    window.location.href = buildSmsHref(smsRecipient, message);

    setAmountInput("");
    setAccountNumber("");
    setReferenceNumber("");
  };

  const handleComplete = async () => {
    if (!validateAmount() || !validateIdentifier()) {
      return;
    }

    const savedTransaction = await submitEwalletSale("PAID");
    if (!savedTransaction) {
      return;
    }

    showSnackbar({ message: `Order ${savedTransaction.orderNo} completed` });
    setAmountInput("");
    setAccountNumber("");
    setReferenceNumber("");
  };

  return {
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
    handleSendSms: () => void handleSendSms(),
    handleComplete: () => void handleComplete(),
  };
}
