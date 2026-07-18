"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import PercentRounded from "@mui/icons-material/PercentRounded";
import ListAltRounded from "@mui/icons-material/ListAltRounded";
import SendToMobileRounded from "@mui/icons-material/SendToMobileRounded";
import AppSnackbar from "@/app/components/app-snackbar";
import ListEmptyState from "@/app/components/list-empty-state";
import LoadConfirmDrawer from "@/app/components/load-confirm-drawer";
import LoadItemCard from "@/app/components/load-item-card";
import LoadMarkupDialog from "@/app/components/load-markup-dialog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import SegmentedControl from "@/app/components/segmented-control";
import SmsRecipientDialog from "@/app/components/sms-recipient-dialog";
import type { SegmentOption } from "@/app/components/segmented-control";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useLoadMarkupSettings } from "@/app/hooks/use-load-markup-settings";
import { useSmsRecipient } from "@/app/hooks/use-sms-recipient";
import { useLoadItems } from "@/app/context/load-items-context";
import { usePageContext } from "@/app/context/page-context";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  LOAD_BRANDS,
  type LoadBrand,
  type LoadCatalogItem,
} from "@/lib/mobile-load-catalog";
import { getSellPrice } from "@/lib/load-markup";
import { buildLoadMessage } from "@/lib/load-message";
import { buildSmsHref } from "@/lib/sms-link";
import { detectNetworkGroup, normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";

function brandLabel(brand: LoadBrand) {
  return LOAD_BRANDS.find((entry) => entry.brand === brand)?.label ?? brand;
}

const BRAND_SEGMENTS: SegmentOption[] = [
  { key: "all", label: "All" },
  ...LOAD_BRANDS.map(({ brand, label }) => ({ key: brand, label })),
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
  const [markupDialogOpen, setMarkupDialogOpen] = useState(false);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [settingsMenuAnchor, setSettingsMenuAnchor] =
    useState<HTMLElement | null>(null);
  const { settings: markupSettings, updateSettings: updateMarkupSettings } =
    useLoadMarkupSettings();
  const { number: smsRecipient, updateNumber: updateSmsRecipient } =
    useSmsRecipient();

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
    if (completing) {
      return;
    }
    setSelectedItem(null);
  };

  const handleSendSms = () => {
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

    const message = buildLoadMessage(selectedItem, confirmNumber);
    window.location.href = buildSmsHref(smsRecipient, message);
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

    setCompleting(true);

    try {
      const sellPrice = getSellPrice(selectedItem.amount, markupSettings);
      const requestId = crypto.randomUUID();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "PAID",
          amountPaid: sellPrice,
          note: `Mobile Load ${brandLabel(selectedItem.brand)} ₱${sellPrice} -> ${confirmNumber}`,
          items: [
            {
              productId: selectedItem.id,
              productName: selectedItem.label,
              quantity: 1,
              unitPrice: sellPrice,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to record load sale");
      }

      const savedTransaction = data as Partial<Transaction>;
      if (
        savedTransaction &&
        typeof savedTransaction.id === "string" &&
        Array.isArray(savedTransaction.items)
      ) {
        addTransaction(savedTransaction as Transaction);
      }

      setSelectedItem(null);
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "Unable to record load sale",
        severity: "error",
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <MobilePageWrapper
      title="Load"
      headerActions={
        <>
          <IconButton
            onClick={(event) => setSettingsMenuAnchor(event.currentTarget)}
            aria-label="load settings"
            aria-haspopup="menu"
            aria-expanded={Boolean(settingsMenuAnchor)}
          >
            <SettingsRounded fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={settingsMenuAnchor}
            open={Boolean(settingsMenuAnchor)}
            onClose={() => setSettingsMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setSettingsMenuAnchor(null);
                setMarkupDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <PercentRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Markup Settings</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSettingsMenuAnchor(null);
                setCurrentPage("manageLoad");
              }}
            >
              <ListItemIcon>
                <ListAltRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Manage Load Items</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSettingsMenuAnchor(null);
                setRecipientDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <SendToMobileRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Request Recipient</ListItemText>
            </MenuItem>
          </Menu>
        </>
      }
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
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

              <ProductsSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search load type"
                ariaLabel="search load type"
                icon="search"
                sticky={false}
              />

              <SegmentedControl
                ariaLabel="load brand"
                segments={BRAND_SEGMENTS}
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
          </Box>

          {loadItemsLoading ? (
            <ListEmptyState description="Loading loads..." />
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
        confirmNumber={confirmNumber}
        completing={completing}
        onClose={handleCloseConfirm}
        onConfirmNumberChange={setConfirmNumber}
        onSendSms={handleSendSms}
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
