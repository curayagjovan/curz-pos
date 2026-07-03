"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import CheckoutDrawer from "@/app/components/checkout-drawer";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { useCart } from "@/app/context/cart-context";
import { useCheckoutCalculations } from "@/app/hooks/use-checkout-calculations";
import { usePageContext } from "@/app/context/page-context";
import type { Product } from "@/types/product";

export default function ProductsPage() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const {
    addToCart,
    cartItems,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paidAmountInput, setPaidAmountInput] = useState("0");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/products?skip=0&limit=9999", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        const items: Product[] = Array.isArray(data)
          ? data
          : (data.items ?? []);

        if (active) {
          setProducts(items);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load products",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name.toLowerCase();
      const sku = product.sku.toLowerCase();
      return name.includes(query) || sku.includes(query);
    });
  }, [products, deferredSearchQuery]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCart({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        quantity: 1,
      });

      setSnackbarMessage(`${product.name} added to cart`);
      setSnackbarOpen(true);
    },
    [addToCart],
  );

  const handleCartFabClick = useCallback(() => {
    setPaidAmountInput("0");
    setCartOpen(true);
  }, []);

  const {
    cartTotal,
    suggestedAmounts,
    parsedPaidAmount,
    changeAmount,
    amountDue,
  } = useCheckoutCalculations({
    cartItems,
    paidAmountInput,
  });

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      setSnackbarMessage("Cart is empty");
      setSnackbarOpen(true);
      return;
    }

    if (parsedPaidAmount < cartTotal) {
      setSnackbarMessage("Insufficient payment amount");
      setSnackbarOpen(true);
      return;
    }

    setCheckoutLoading(true);

    try {
      const payload = {
        status: "PAID" as const,
        amountPaid: parsedPaidAmount,
        items: cartItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Checkout failed");
      }

      clearCart();
      setPaidAmountInput("0");
      setCartOpen(false);
      setSnackbarMessage(
        data?.orderNo
          ? `Order ${data.orderNo} completed`
          : "Checkout completed",
      );
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage(
        err instanceof Error ? err.message : "Unable to complete checkout",
      );
      setSnackbarOpen(true);
    } finally {
      setCheckoutLoading(false);
    }
  }, [cartItems, parsedPaidAmount, cartTotal, clearCart]);

  const handleCloseCart = useCallback(() => {
    setCartOpen(false);
    setPaidAmountInput("0");
  }, []);

  const handleClearCart = useCallback(() => {
    clearCart();
    setPaidAmountInput("0");
  }, [clearCart]);

  return (
    <MobilePageWrapper title="Products">
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <ProductsSearchBar value={searchQuery} onChange={setSearchQuery} />

          <Box sx={{ px: 0.5, color: "text.secondary", typography: "caption" }}>
            {loading
              ? "Loading products..."
              : `${filteredProducts.length.toLocaleString()} products`}
          </Box>

          <ProductsCatalog
            products={filteredProducts}
            loading={loading}
            error={error}
            onAddToCart={handleAddToCart}
          />
        </Stack>
      </Container>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1400}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {!cartOpen ? (
        <Fab
          color="primary"
          aria-label="open cart"
          onClick={handleCartFabClick}
          sx={{
            position: "fixed",
            right: "calc(env(safe-area-inset-right) + 16px)",
            bottom: "calc(env(safe-area-inset-bottom) + 88px)",
            zIndex: 1201,
          }}
        >
          <Badge
            color="error"
            badgeContent={cartCount}
            overlap="circular"
            max={99}
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
        onClose={handleCloseCart}
        onPaidAmountChange={setPaidAmountInput}
        onRemoveFromCart={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
      />
    </MobilePageWrapper>
  );
}
