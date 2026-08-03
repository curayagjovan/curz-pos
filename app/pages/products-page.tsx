"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import AppSnackbar from "@/app/components/app-snackbar";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import CartFlightOverlay from "@/app/components/cart-flight-overlay";
import CategoryFilterChips from "@/app/components/category-filter-chips";
import CheckoutDrawer from "@/app/components/checkout-drawer";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { useCustomers } from "@/app/context/customers-context";
import { useProducts } from "@/app/context/products-context";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useCart } from "@/app/context/cart-context";
import { useCartFlightAnimation } from "@/app/hooks/use-cart-flight-animation";
import { useProductsCheckout } from "@/app/hooks/use-products-checkout";
import { useSenderPushEndpoint } from "@/app/hooks/use-sender-push-endpoint";
import { usePageContext } from "@/app/context/page-context";
import { computePopularProducts } from "@/lib/popular-products";
import type { ProductCategoryValue } from "@/lib/product-categories";
import type { Product } from "@/types/product";
import Divider from "@mui/material/Divider";

export default function ProductsPage() {
  const { searchQuery, setSearchQuery, setCurrentPage } = usePageContext();
  const { addToCart, cartItems, cartCount, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const { products, loading, error } = useProducts();
  const { transactions, addTransaction, refreshTransactions } =
    useTransactions();
  const { customers, createCustomer } = useCustomers();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();
  const [categoryFilter, setCategoryFilter] =
    useState<ProductCategoryValue | null>(null);
  const [analysisTimeMs] = useState(() => Date.now());
  const senderPushEndpointRef = useSenderPushEndpoint();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const { cartFlights, isCartPulseVisible, cartFabRef, launchCartFlight } =
    useCartFlightAnimation();

  const handleCreateCustomer = useCallback(
    async (input: { name: string; phone?: string }) => {
      try {
        return await createCustomer(input);
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : "Unable to add customer",
          severity: "error",
        });
        return null;
      }
    },
    [createCustomer, showSnackbar],
  );

  const categoryFilteredProducts = useMemo(() => {
    if (!categoryFilter) {
      return products;
    }

    return products.filter((product) => product.category === categoryFilter);
  }, [products, categoryFilter]);

  const filteredProducts = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) {
      return categoryFilteredProducts;
    }

    return categoryFilteredProducts.filter((product) => {
      const name = product.name.toLowerCase();
      const sku = product.sku.toLowerCase();
      const description = product.description?.toLowerCase() ?? "";
      return (
        name.includes(query) ||
        sku.includes(query) ||
        description.includes(query)
      );
    });
  }, [categoryFilteredProducts, deferredSearchQuery]);

  const popularItems = useMemo(
    () => computePopularProducts(transactions, analysisTimeMs),
    [analysisTimeMs, transactions],
  );

  const popularProducts = useMemo(() => {
    if (popularItems.items.length === 0) {
      return [] as Product[];
    }

    const productByName = new Map(
      filteredProducts.map((product) => [
        product.name.trim().toLowerCase(),
        product,
      ]),
    );

    // Match the ranked list against real products first, then cap the
    // section at 5 — a load/e-wallet line in the ranking can't steal a slot.
    return popularItems.items
      .map((item) => productByName.get(item.productName.trim().toLowerCase()))
      .filter((product): product is Product => Boolean(product))
      .slice(0, 5);
  }, [filteredProducts, popularItems.items]);

  const popularProductNameSet = useMemo(() => {
    return new Set(
      popularProducts.map((product) => product.name.trim().toLowerCase()),
    );
  }, [popularProducts]);

  const regularProducts = useMemo(() => {
    if (popularProductNameSet.size === 0) {
      return filteredProducts;
    }

    return filteredProducts.filter(
      (product) =>
        !popularProductNameSet.has(product.name.trim().toLowerCase()),
    );
  }, [filteredProducts, popularProductNameSet]);

  const handleAddToCart = useCallback(
    (product: Product, sourceRect?: DOMRect) => {
      const bundleQty =
        product.bundleQty == null ? null : Number(product.bundleQty);
      const bundlePrice =
        product.bundlePrice == null ? null : Number(product.bundlePrice);

      addToCart({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        quantity: 1,
        bundleQty:
          bundleQty !== null && Number.isFinite(bundleQty) ? bundleQty : null,
        bundlePrice:
          bundlePrice !== null && Number.isFinite(bundlePrice)
            ? bundlePrice
            : null,
      });

      launchCartFlight(product.name, sourceRect);
    },
    [addToCart, launchCartFlight],
  );

  const {
    cartOpen,
    checkoutLoading,
    pendingCheckoutLoading,
    checkoutCooldown,
    paidAmountInput,
    cartTotal,
    suggestedAmounts,
    amountDue,
    changeAmount,
    handleCartFabClick,
    handlePaidAmountChange,
    handleCheckout,
    handleCheckoutPending,
    handleCloseCart,
    handleClearCart,
  } = useProductsCheckout({
    cartItems,
    removeFromCart,
    clearCart,
    addTransaction,
    refreshTransactions,
    showSnackbar,
    senderPushEndpointRef,
    setSearchQuery,
  });

  return (
    <MobilePageWrapper
      title="Products"
      pageMenuItems={(closeMenu) => [
        <MenuItem
          key="inventory"
          onClick={() => {
            closeMenu();
            setCurrentPage("inventory");
          }}
        >
          <ListItemIcon>
            <Inventory2Rounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Inventory</ListItemText>
        </MenuItem>,
      ]}
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1}>
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
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ProductsSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  icon="search"
                  sticky={false}
                />
              </Box>
              <Divider orientation="vertical" sx={{ height: 35 }} />
              <CategoryFilterChips
                products={products}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            </Stack>
          </Box>

          <Box sx={{ px: 0.5, color: "text.secondary", typography: "caption" }}>
            {loading
              ? "Loading products..."
              : `${filteredProducts.length.toLocaleString()} products`}
          </Box>

          {!loading && !error && popularProducts.length > 0 ? (
            <Stack spacing={0.75}>
              <Typography
                variant="overline"
                sx={{ px: 0.5, color: "text.secondary", fontWeight: 700 }}
              >
                Popular Items
              </Typography>
              <ProductsCatalog
                products={popularProducts}
                loading={false}
                error={null}
                onAddToCart={handleAddToCart}
              />
            </Stack>
          ) : null}

          <Stack spacing={0.75}>
            {!loading && !error && popularProducts.length > 0 ? (
              <Typography
                variant="overline"
                sx={{ px: 0.5, color: "text.secondary", fontWeight: 700 }}
              >
                Products
              </Typography>
            ) : null}
            <ProductsCatalog
              products={regularProducts}
              loading={loading}
              error={error}
              onAddToCart={handleAddToCart}
            />
          </Stack>

          <Box sx={{ height: 72 }} aria-hidden />
        </Stack>
      </Container>

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
      />

      <CartFlightOverlay flights={cartFlights} />

      {!cartOpen ? (
        <Fab
          ref={cartFabRef}
          color="primary"
          aria-label="open cart"
          onClick={handleCartFabClick}
          sx={{
            position: "fixed",
            right: "calc(env(safe-area-inset-right) + 16px)",
            bottom: "calc(env(safe-area-inset-bottom) + 88px)",
            zIndex: 1201,
            transform: isCartPulseVisible ? "scale(1.08)" : "scale(1)",
            boxShadow: isCartPulseVisible
              ? "0 0 0 10px rgba(33, 150, 243, 0.16), 0 12px 28px rgba(33, 150, 243, 0.28)"
              : undefined,
            transition: "transform 180ms ease, box-shadow 240ms ease",
          }}
        >
          <Badge
            color="error"
            badgeContent={cartCount}
            overlap="circular"
            max={99}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
              "& .MuiBadge-badge": {
                top: 0,
                right: 0,
                transform: isCartPulseVisible
                  ? "translate(100%, -100%) scale(1.18)"
                  : "translate(100%, -100%) scale(1)",
                transition: "transform 180ms ease",
              },
            }}
          >
            <ShoppingCartRounded />
          </Badge>
        </Fab>
      ) : null}

      <CheckoutDrawer
        open={cartOpen}
        cartItems={cartItems}
        cartCount={cartCount}
        cartTotal={cartTotal}
        paidAmountInput={paidAmountInput}
        suggestedAmounts={suggestedAmounts}
        amountDue={amountDue}
        changeAmount={changeAmount}
        checkoutLoading={checkoutLoading}
        pendingCheckoutLoading={pendingCheckoutLoading}
        checkoutDisabled={checkoutCooldown}
        customers={customers}
        onCreateCustomer={handleCreateCustomer}
        onClose={handleCloseCart}
        onPaidAmountChange={handlePaidAmountChange}
        onRemoveFromCart={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onCheckoutPending={handleCheckoutPending}
      />
    </MobilePageWrapper>
  );
}
