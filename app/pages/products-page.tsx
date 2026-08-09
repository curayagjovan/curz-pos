"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppSnackbar from "@/app/components/app-snackbar";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import CartFlightOverlay from "@/app/components/cart-flight-overlay";
import CategoryFilterChips from "@/app/components/category-filter-chips";
import CheckoutDrawer from "@/app/components/checkout-drawer";
import MiniCartBar from "@/app/components/mini-cart-bar";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { useAuth } from "@/app/context/auth-context";
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
import { hasPermission } from "@/lib/auth/permissions";
import { normalizeBundleTiers } from "@/lib/bundle-pricing";
import { hapticTick } from "@/lib/haptics";
import type { ProductCategoryValue } from "@/lib/product-categories";
import type { Product } from "@/types/product";
import Divider from "@mui/material/Divider";

export default function ProductsPage() {
  const { searchQuery, setSearchQuery, setCurrentPage } = usePageContext();
  const { addToCart, cartItems, cartCount, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const { products, loading, error, togglePin } = useProducts();
  const { addTransaction, refreshTransactions } = useTransactions();
  const { customers, createCustomer } = useCustomers();
  const { appUser } = useAuth();
  const canViewProductMovement = hasPermission(
    appUser,
    "VIEW_PRODUCT_MOVEMENT",
  );
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();
  const [categoryFilter, setCategoryFilter] =
    useState<ProductCategoryValue | null>(null);
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

  const pinnedProducts = useMemo(
    () => filteredProducts.filter((product) => product.isPinned),
    [filteredProducts],
  );

  const regularProducts = useMemo(
    () => filteredProducts.filter((product) => !product.isPinned),
    [filteredProducts],
  );

  const handleAddToCart = useCallback(
    (product: Product, sourceRect?: DOMRect, quantity = 1) => {
      addToCart(
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          quantity,
          bundleTiers: normalizeBundleTiers(product.bundleTiers),
        },
        quantity,
      );

      hapticTick();
      launchCartFlight(product.name, sourceRect);
    },
    [addToCart, launchCartFlight],
  );

  const handleQuickAddBundle = useCallback(
    (product: Product, quantity: number) => {
      handleAddToCart(product, undefined, quantity);
    },
    [handleAddToCart],
  );

  const handleTogglePin = useCallback(
    async (product: Product) => {
      try {
        await togglePin(product.id, !product.isPinned);
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : "Unable to update pin",
          severity: "error",
        });
      }
    },
    [togglePin, showSnackbar],
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
        ...(canViewProductMovement
          ? [
              <MenuItem
                key="productMovement"
                onClick={() => {
                  closeMenu();
                  setCurrentPage("productMovement");
                }}
              >
                <ListItemIcon>
                  <TrendingUpRounded fontSize="small" />
                </ListItemIcon>
                <ListItemText>Product Movement</ListItemText>
              </MenuItem>,
            ]
          : []),
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

          {!loading && !error && pinnedProducts.length > 0 ? (
            <Stack spacing={0.75}>
              <Typography
                variant="overline"
                sx={{ px: 0.5, color: "text.secondary", fontWeight: 700 }}
              >
                Pinned
              </Typography>
              <ProductsCatalog
                products={pinnedProducts}
                loading={false}
                error={null}
                onAddToCart={handleAddToCart}
                onQuickAddBundle={handleQuickAddBundle}
                onTogglePin={handleTogglePin}
              />
            </Stack>
          ) : null}

          <Stack spacing={0.75}>
            {!loading && !error && pinnedProducts.length > 0 ? (
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
              onQuickAddBundle={handleQuickAddBundle}
              onTogglePin={handleTogglePin}
            />
          </Stack>

          <Box sx={{ height: 88 }} aria-hidden />
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
        <MiniCartBar
          barRef={cartFabRef}
          cartItems={cartItems}
          cartCount={cartCount}
          cartTotal={cartTotal}
          isPulsing={isCartPulseVisible}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onClearCart={handleClearCart}
          onCheckout={handleCartFabClick}
        />
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
