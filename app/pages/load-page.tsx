"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import AppSnackbar from "@/app/components/app-snackbar";
import ListEmptyState from "@/app/components/list-empty-state";
import LoadConfirmDrawer from "@/app/components/load-confirm-drawer";
import LoadItemCard from "@/app/components/load-item-card";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  LOAD_BRANDS,
  LOAD_CATALOG,
  type LoadBrand,
  type LoadCatalogItem,
} from "@/lib/mobile-load-catalog";
import {
  LoadRequestShareCancelledError,
  buildLoadMessage,
  shareLoadRequest,
} from "@/lib/load-message";
import { detectNetworkGroup, normalizeMobileNumber } from "@/lib/ph-network";
import type { Transaction } from "@/types/transaction";

function brandLabel(brand: LoadBrand) {
  return LOAD_BRANDS.find((entry) => entry.brand === brand)?.label ?? brand;
}

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
  const { addTransaction } = useTransactions();
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
  const [sending, setSending] = useState(false);

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

  const toggleBrand = (brand: LoadBrand) => {
    setAutoDetected(false);
    setBrandFilter((current) =>
      current.size === 1 && current.has(brand) ? new Set() : new Set([brand]),
    );
  };

  const clearBrandFilter = () => {
    setAutoDetected(false);
    setBrandFilter(new Set());
  };

  const filteredItems = useMemo(
    () =>
      LOAD_CATALOG.filter(
        (item) =>
          (brandFilter.size === 0 || brandFilter.has(item.brand)) &&
          matchesLoadSearch(item, searchQuery),
      ),
    [brandFilter, searchQuery],
  );

  const handleSelectItem = (item: LoadCatalogItem) => {
    setSelectedItem(item);
    setConfirmNumber(mobileNumber);
  };

  const handleCloseConfirm = () => {
    if (sending) {
      return;
    }
    setSelectedItem(null);
  };

  const handleSend = async () => {
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

    setSending(true);

    try {
      const message = buildLoadMessage(selectedItem, confirmNumber);
      const shareResult = await shareLoadRequest(message);

      const requestId = crypto.randomUUID();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "PENDING",
          note: `Mobile Load ${brandLabel(selectedItem.brand)} ₱${selectedItem.amount} -> ${confirmNumber}`,
          items: [
            {
              productId: selectedItem.id,
              productName: selectedItem.label,
              quantity: 1,
              unitPrice: selectedItem.amount,
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

      if (shareResult === "copied") {
        showSnackbar({
          message:
            "Sharing isn't supported on this device. Load command copied instead.",
          severity: "info",
        });
      }

      setSelectedItem(null);
    } catch (error) {
      if (error instanceof LoadRequestShareCancelledError) {
        return;
      }

      showSnackbar({
        message: error instanceof Error ? error.message : "Unable to send load",
        severity: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <MobilePageWrapper title="Load">
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

              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", rowGap: 1 }}
              >
                <Chip
                  label="All"
                  color={brandFilter.size === 0 ? "primary" : "default"}
                  onClick={clearBrandFilter}
                />
                {LOAD_BRANDS.map(({ brand, label }) => (
                  <Chip
                    key={brand}
                    label={label}
                    color={brandFilter.has(brand) ? "primary" : "default"}
                    onClick={() => toggleBrand(brand)}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>

          {filteredItems.length === 0 ? (
            <ListEmptyState description="No load types match your search." />
          ) : (
            <List disablePadding>
              {filteredItems.map((item) => (
                <LoadItemCard
                  key={item.id}
                  item={item}
                  brandLabel={brandLabel(item.brand)}
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
        confirmNumber={confirmNumber}
        sending={sending}
        onClose={handleCloseConfirm}
        onConfirmNumberChange={setConfirmNumber}
        onSend={() => void handleSend()}
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
