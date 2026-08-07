"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import PercentRounded from "@mui/icons-material/PercentRounded";
import ListAltRounded from "@mui/icons-material/ListAltRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import SendToMobileRounded from "@mui/icons-material/SendToMobileRounded";
import AppSnackbar from "@/app/components/app-snackbar";
import FadeInContent from "@/app/components/fade-in-content";
import ListEmptyState from "@/app/components/list-empty-state";
import ListSkeleton from "@/app/components/list-skeleton";
import LoadConfirmDrawer from "@/app/components/load-confirm-drawer";
import LoadItemCard from "@/app/components/load-item-card";
import LoadMarkupDialog from "@/app/components/load-markup-dialog";
import FilterPopoverButton from "@/app/components/filter-popover-button";
import type { FilterPopoverOption } from "@/app/components/filter-popover-button";
import ProductsSearchBar from "@/app/components/products-search-bar";
import SmsRecipientDialog from "@/app/components/sms-recipient-dialog";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useLoadCheckout } from "@/app/hooks/use-load-checkout";
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
import { detectNetworkGroup } from "@/lib/ph-network";
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
  const [markupDialogOpen, setMarkupDialogOpen] = useState(false);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const { settings: markupSettings, updateSettings: updateMarkupSettings } =
    useLoadMarkupSettings();
  const { number: smsRecipient, updateNumber: updateSmsRecipient } =
    useSmsRecipient();
  const senderPushEndpointRef = useSenderPushEndpoint();

  const {
    selectedItem,
    confirmNumber,
    setConfirmNumber,
    completing,
    sendingRequest,
    submitError,
    setSubmitError,
    handleSelectItem,
    handleCloseConfirm,
    handleSendSms,
    handleComplete,
  } = useLoadCheckout({
    addTransaction,
    showSnackbar,
    markupSettings,
    smsRecipient,
    senderPushEndpointRef,
    onMissingRecipient: () => setRecipientDialogOpen(true),
    brandLabel,
  });

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
            <ListSkeleton />
          ) : filteredItems.length === 0 ? (
            <ListEmptyState
              description="No load types match your search."
              icon={<SearchOffRounded fontSize="small" />}
            />
          ) : (
            <FadeInContent>
              <List disablePadding>
                {filteredItems.map((item) => (
                  <LoadItemCard
                    key={item.id}
                    item={item}
                    brandLabel={brandLabel(item.brand)}
                    price={getSellPrice(item.amount, markupSettings)}
                    onSelect={(selected) =>
                      handleSelectItem(selected, mobileNumber)
                    }
                  />
                ))}
              </List>
            </FadeInContent>
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
        onSendSms={handleSendSms}
        onComplete={handleComplete}
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
