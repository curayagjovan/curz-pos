"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import PercentRounded from "@mui/icons-material/PercentRounded";
import ListAltRounded from "@mui/icons-material/ListAltRounded";
import SendToMobileRounded from "@mui/icons-material/SendToMobileRounded";
import AppSnackbar from "@/app/components/app-snackbar";
import ListEmptyState from "@/app/components/list-empty-state";
import LoadConfirmDrawer from "@/app/components/load-confirm-drawer";
import LoadItemCard from "@/app/components/load-item-card";
import LoadMarkupDialog from "@/app/components/load-markup-dialog";
import FilterPopoverButton from "@/app/components/filter-popover-button";
import type { FilterPopoverOption } from "@/app/components/filter-popover-button";
import ProductsSearchBar from "@/app/components/products-search-bar";
import SmsRecipientDialog from "@/app/components/sms-recipient-dialog";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useLoadMarkupSettings } from "@/app/hooks/use-load-markup-settings";
import { useSenderPushEndpoint } from "@/app/hooks/use-sender-push-endpoint";
import { useSmsRecipient } from "@/app/hooks/use-sms-recipient";
import { useLoadItems } from "@/app/context/load-items-context";
import { usePageContext } from "@/app/context/page-context";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  LOAD_BRAND_COLORS,
  LOAD_BRANDS,
  type LoadBrand,
  type LoadCatalogItem,
} from "@/lib/mobile-load-catalog";
import { getMarkupForAmount, getSellPrice } from "@/lib/load-markup";
import { buildLoadMessage } from "@/lib/load-message";
import { buildSmsHref } from "@/lib/sms-link";
import { detectNetworkGroup, normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";
import Divider from "@mui/material/Divider";

function brandLabel(brand: LoadBrand) {
  return LOAD_BRANDS.find((entry) => entry.brand === brand)?.label ?? brand;
}

const BRAND_OPTIONS: FilterPopoverOption[] = [
  { key: "all", label: "All" },
  ...LOAD_BRANDS.map(({ brand, label }) => ({
    key: brand,
    label,
    color: LOAD_BRAND_COLORS[brand],
  })),
];

function matchesLoadSearch(item: LoadCatalogItem, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    item.label.toLowerCase().includes(normalized) ||
    brandLabel(item.brand).toLowerCase().includes(normalized) ||
    item.code.toLowerCase().includes(normalized) ||
    String(item.amount).includes(normalized)
  );
}

export default function LoadPage() {
  const { setCurrentPage } = usePageContext();
  const { addTransaction } = useTransactions();
  const { loadItems, loading: loadItemsLoading } = useLoadItems();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();

  const [mobileNumber, setMobileNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<Set<LoadBrand>>(new Set());
  const [autoDetected, setAutoDetected] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LoadCatalogItem | null>(
    null,
  );
  const [confirmNumber, setConfirmNumber] = useState("");
  const [completing, setCompleting] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [markupDialogOpen, setMarkupDialogOpen] = useState(false);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const { settings: markupSettings, updateSettings: updateMarkupSettings } =
    useLoadMarkupSettings();
  const { number: smsRecipient, updateNumber: updateSmsRecipient } =
    useSmsRecipient();
  const senderPushEndpointRef = useSenderPushEndpoint();

  const handleNumberChange = (value: string) => {
    setMobileNumber(value);
    const group = detectNetworkGroup(value);

    if (group) {
      const brands = LOAD_BRANDS.filter((entry) => entry.group === group).map(
        (entry) => entry.brand,
      );
      setBrandFilter(new Set(brands));
      setAutoDetected(true);
    } else if (autoDetected) {
      setBrandFilter(new Set());
      setAutoDetected(false);
    }
  };

  const selectBrand = (brand: LoadBrand) => {
    setAutoDetected(false);
    setBrandFilter(new Set([brand]));
  };

  const clearBrandFilter = () => {
    setAutoDetected(false);
    setBrandFilter(new Set());
  };

  const filteredItems = useMemo(
    () =>
      loadItems
        .filter(
          (item: LoadCatalogItem) =>
            (brandFilter.size === 0 || brandFilter.has(item.brand)) &&
            matchesLoadSearch(item, searchQuery),
        )
        .sort((left, right) =>
          left.label.localeCompare(right.label, undefined, {
            numeric: true,
          }),
        ),
    [loadItems, brandFilter, searchQuery],
  );

  const handleSelectItem = (item: LoadCatalogItem) => {
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
      setRecipientDialogOpen(true);
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

  return (
    <MobilePageWrapper
      title="Load"
      pageMenuItems={(closeMenu) => [
        <MenuItem
          key="markup-settings"
          onClick={() => {
            closeMenu();
            setMarkupDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <PercentRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Markup Settings</ListItemText>
        </MenuItem>,
        <MenuItem
          key="manage-load-items"
          onClick={() => {
            closeMenu();
            setCurrentPage("manageLoad");
          }}
        >
          <ListItemIcon>
            <ListAltRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Load Items</ListItemText>
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
      ]}
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          {submitError ? (
            <Alert severity="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          ) : null}

          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              pt: 0.5,
              pb: 1,
              bgcolor: "background.default",
            }}
          >
            <Stack spacing={0.5}>
              <ProductsSearchBar
                value={mobileNumber}
                onChange={handleNumberChange}
                placeholder="Mobile number"
                ariaLabel="mobile number"
                icon="mobile"
                sticky={false}
                inputMode="tel"
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <ProductsSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search load type"
                    ariaLabel="search load type"
                    icon="search"
                    sticky={false}
                  />
                </Box>
                <Divider orientation="vertical" sx={{ height: 30 }} />
                <FilterPopoverButton
                  ariaLabel="load brand"
                  options={BRAND_OPTIONS}
                  selectedKeys={
                    brandFilter.size === 0 ? ["all"] : Array.from(brandFilter)
                  }
                  onSelect={(key) =>
                    key === "all"
                      ? clearBrandFilter()
                      : selectBrand(key as LoadBrand)
                  }
                />
              </Stack>
            </Stack>
          </Box>

          {loadItemsLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : filteredItems.length === 0 ? (
            <ListEmptyState description="No load types match your search." />
          ) : (
            <List disablePadding>
              {filteredItems.map((item) => (
                <LoadItemCard
                  key={item.id}
                  item={item}
                  brandLabel={brandLabel(item.brand)}
                  price={getSellPrice(item.amount, markupSettings)}
                  onSelect={handleSelectItem}
                />
              ))}
            </List>
          )}
        </Stack>
      </Container>

      <LoadConfirmDrawer
        open={Boolean(selectedItem)}
        item={selectedItem}
        brandLabel={selectedItem ? brandLabel(selectedItem.brand) : ""}
        price={
          selectedItem ? getSellPrice(selectedItem.amount, markupSettings) : 0
        }
        markup={
          selectedItem
            ? getMarkupForAmount(selectedItem.amount, markupSettings)
            : 0
        }
        confirmNumber={confirmNumber}
        completing={completing}
        sendingRequest={sendingRequest}
        onClose={handleCloseConfirm}
        onConfirmNumberChange={setConfirmNumber}
        onSendSms={() => void handleSendSms()}
        onComplete={() => void handleComplete()}
      />

      <LoadMarkupDialog
        open={markupDialogOpen}
        settings={markupSettings}
        onClose={() => setMarkupDialogOpen(false)}
        onSave={updateMarkupSettings}
      />

      <SmsRecipientDialog
        open={recipientDialogOpen}
        number={smsRecipient}
        onClose={() => setRecipientDialogOpen(false)}
        onSave={updateSmsRecipient}
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
