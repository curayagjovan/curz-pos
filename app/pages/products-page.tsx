"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import AppSnackbar from "@/app/components/app-snackbar";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import CheckoutDrawer from "@/app/components/checkout-drawer";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { useProducts } from "@/app/context/products-context";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useCart } from "@/app/context/cart-context";
import { useCheckoutCalculations } from "@/app/hooks/use-checkout-calculations";
import { usePageContext } from "@/app/context/page-context";
import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";

type CartFlight = {
  id: number;
  label: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  active: boolean;
};

const CART_FLIGHT_DURATION_MS = 620;

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
  const { products, loading, error } = useProducts();
  const { transactions, addTransaction } = useTransactions();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paidAmountInput, setPaidAmountInput] = useState("0");
  const [analysisTimeMs] = useState(() => Date.now());
  const [isCartPulseVisible, setIsCartPulseVisible] = useState(false);
  const [cartFlights, setCartFlights] = useState<CartFlight[]>([]);
  const cartPulseTimeoutRef = useRef<number | null>(null);
  const cartFabRef = useRef<HTMLButtonElement | null>(null);
  const cartFlightIdRef = useRef(0);
  const cartFlightFrameRef = useRef<number[]>([]);
  const cartFlightTimeoutRef = useRef<number[]>([]);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const triggerCartPulse = useCallback(() => {
    if (cartPulseTimeoutRef.current !== null) {
      window.clearTimeout(cartPulseTimeoutRef.current);
    }

    setIsCartPulseVisible(true);
    cartPulseTimeoutRef.current = window.setTimeout(() => {
      setIsCartPulseVisible(false);
      cartPulseTimeoutRef.current = null;
    }, 650);
  }, []);

  useEffect(() => {
    return () => {
      if (cartPulseTimeoutRef.current !== null) {
        window.clearTimeout(cartPulseTimeoutRef.current);
      }

      for (const frameId of cartFlightFrameRef.current) {
        window.cancelAnimationFrame(frameId);
      }

      for (const timeoutId of cartFlightTimeoutRef.current) {
        window.clearTimeout(timeoutId);
      }
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

  const popularItems = useMemo(() => {
    const paidTransactions = transactions.filter(
      (transaction) => transaction.status === "PAID",
    );
    const DAY_MS = 24 * 60 * 60 * 1000;

    const countInWindow = (days: number) =>
      paidTransactions.filter((transaction) => {
        const createdAtMs = new Date(transaction.createdAt).getTime();
        return (
          Number.isFinite(createdAtMs) &&
          createdAtMs >= analysisTimeMs - days * DAY_MS &&
          createdAtMs <= analysisTimeMs
        );
      }).length;

    const count14 = countInWindow(14);
    let selectedWindowDays = 14;
    if (count14 < 40) {
      const count30 = countInWindow(30);
      selectedWindowDays = 30;

      if (count30 < 80) {
        const count60 = countInWindow(60);
        selectedWindowDays = count60 < 80 ? 90 : 60;
      }
    }

    const selectedTransactions = paidTransactions.filter((transaction) => {
      const createdAtMs = new Date(transaction.createdAt).getTime();
      return (
        Number.isFinite(createdAtMs) &&
        createdAtMs >= analysisTimeMs - selectedWindowDays * DAY_MS &&
        createdAtMs <= analysisTimeMs
      );
    });

    const summaryByProduct = new Map<
      string,
      {
        productName: string;
        quantitySold: number;
        orderCount: number;
        revenue: number;
        activeDays: Set<string>;
        velocity: number;
        penetration: number;
        consistency: number;
        score: number;
      }
    >();

    for (const transaction of selectedTransactions) {
      const countedInOrder = new Set<string>();
      const orderDate = new Date(transaction.createdAt);
      const orderDayToken = Number.isNaN(orderDate.getTime())
        ? null
        : orderDate.toISOString().slice(0, 10);

      for (const item of transaction.items) {
        const key = item.productName.trim().toLowerCase();
        if (!key) {
          continue;
        }

        const quantity = Number(item.quantity);
        const lineTotal = Number(item.lineTotal);
        const current = summaryByProduct.get(key) ?? {
          productName: item.productName,
          quantitySold: 0,
          orderCount: 0,
          revenue: 0,
          activeDays: new Set<string>(),
          velocity: 0,
          penetration: 0,
          consistency: 0,
          score: 0,
        };

        current.quantitySold += Number.isFinite(quantity) ? quantity : 0;
        current.revenue += Number.isFinite(lineTotal) ? lineTotal : 0;

        if (!countedInOrder.has(key)) {
          current.orderCount += 1;
          countedInOrder.add(key);
        }

        if (orderDayToken) {
          current.activeDays.add(orderDayToken);
        }

        summaryByProduct.set(key, current);
      }
    }

    const windowOrderCount = selectedTransactions.length;
    const candidates = Array.from(summaryByProduct.values()).map((item) => {
      const velocity = item.quantitySold / selectedWindowDays;
      const penetration =
        windowOrderCount > 0 ? item.orderCount / windowOrderCount : 0;
      const consistency = item.activeDays.size / selectedWindowDays;

      return {
        ...item,
        velocity,
        penetration,
        consistency,
      };
    });

    const normalize = (values: number[]) => {
      const min = Math.min(...values);
      const max = Math.max(...values);

      return (value: number) => {
        if (!Number.isFinite(value)) {
          return 0;
        }
        if (max === min) {
          return value > 0 ? 1 : 0;
        }
        return (value - min) / (max - min);
      };
    };

    const normalizeVelocity = normalize(
      candidates.map((item) => item.velocity),
    );
    const normalizePenetration = normalize(
      candidates.map((item) => item.penetration),
    );

    const scoredCandidates = candidates.map((item) => {
      const score =
        0.6 * normalizeVelocity(item.velocity) +
        0.25 * normalizePenetration(item.penetration) +
        0.15 * item.consistency;

      return {
        ...item,
        score,
      };
    });

    const eligibleItems = scoredCandidates.filter(
      (item) => item.quantitySold >= 8 && item.orderCount >= 5,
    );

    const rankedEligibleItems = eligibleItems.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.quantitySold !== a.quantitySold) {
        return b.quantitySold - a.quantitySold;
      }
      return a.productName.localeCompare(b.productName);
    });

    const topPercentCount =
      rankedEligibleItems.length > 0
        ? Math.ceil(rankedEligibleItems.length * 0.2)
        : 0;
    const takeCount = Math.min(5, Math.max(1, topPercentCount));

    return {
      selectedWindowDays,
      totalPaidOrdersInWindow: windowOrderCount,
      items: rankedEligibleItems.slice(0, takeCount),
    };
  }, [analysisTimeMs, transactions]);

  const popularProductNameSet = useMemo(() => {
    return new Set(
      popularItems.items.map((item) => item.productName.trim().toLowerCase()),
    );
  }, [popularItems.items]);

  const popularProducts = useMemo(() => {
    if (popularProductNameSet.size === 0) {
      return [] as Product[];
    }

    const productByName = new Map(
      filteredProducts.map((product) => [
        product.name.trim().toLowerCase(),
        product,
      ]),
    );

    return popularItems.items
      .map((item) => productByName.get(item.productName.trim().toLowerCase()))
      .filter((product): product is Product => Boolean(product));
  }, [filteredProducts, popularItems.items, popularProductNameSet]);

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

      const targetRect = cartFabRef.current?.getBoundingClientRect();
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (sourceRect && targetRect && !prefersReducedMotion) {
        const id = cartFlightIdRef.current + 1;
        const startX = sourceRect.left + sourceRect.width / 2;
        const startY = sourceRect.top + sourceRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;

        cartFlightIdRef.current = id;
        setCartFlights((current) => [
          ...current,
          {
            id,
            label: product.name,
            startX,
            startY,
            deltaX: endX - startX,
            deltaY: endY - startY,
            active: false,
          },
        ]);

        const frameId = window.requestAnimationFrame(() => {
          setCartFlights((current) =>
            current.map((flight) =>
              flight.id === id ? { ...flight, active: true } : flight,
            ),
          );
          cartFlightFrameRef.current = cartFlightFrameRef.current.filter(
            (currentId) => currentId !== frameId,
          );
        });
        cartFlightFrameRef.current.push(frameId);

        const pulseTimeoutId = window.setTimeout(() => {
          triggerCartPulse();
          cartFlightTimeoutRef.current = cartFlightTimeoutRef.current.filter(
            (currentId) => currentId !== pulseTimeoutId,
          );
        }, CART_FLIGHT_DURATION_MS - 120);
        cartFlightTimeoutRef.current.push(pulseTimeoutId);

        const cleanupTimeoutId = window.setTimeout(() => {
          setCartFlights((current) =>
            current.filter((flight) => flight.id !== id),
          );
          cartFlightTimeoutRef.current = cartFlightTimeoutRef.current.filter(
            (currentId) => currentId !== cleanupTimeoutId,
          );
        }, CART_FLIGHT_DURATION_MS + 120);
        cartFlightTimeoutRef.current.push(cleanupTimeoutId);
      } else {
        triggerCartPulse();
      }

      showSnackbar({ message: `${product.name} added to cart` });
    },
    [addToCart, showSnackbar, triggerCartPulse],
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
      showSnackbar({ message: "Cart is empty", severity: "error" });
      return;
    }

    if (parsedPaidAmount < cartTotal) {
      showSnackbar({
        message: "Insufficient payment amount",
        severity: "error",
      });
      return;
    }

    setCheckoutLoading(true);

    try {
      const requestId = crypto.randomUUID();
      const payload = {
        requestId,
        status: "PAID" as const,
        amountPaid: parsedPaidAmount,
        items: cartItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      };

      const submitOrder = () =>
        fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

      let response = await submitOrder();
      if (!response.ok && response.status >= 500) {
        response = await submitOrder();
      }

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 409 &&
          Array.isArray(data?.missingProductIds) &&
          data.missingProductIds.length > 0
        ) {
          for (const productId of data.missingProductIds as string[]) {
            removeFromCart(productId);
          }

          throw new Error(
            data?.message ||
              "Some items are no longer available and were removed from cart",
          );
        }

        throw new Error(data?.message || "Checkout failed");
      }

      clearCart();
      setPaidAmountInput("0");
      setCartOpen(false);
      addTransaction(data as Transaction);
      showSnackbar({
        message: data?.orderNo
          ? `Order ${data.orderNo} completed`
          : "Checkout completed",
      });
    } catch (err) {
      showSnackbar({
        message:
          err instanceof Error ? err.message : "Unable to complete checkout",
        severity: "error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  }, [
    cartItems,
    parsedPaidAmount,
    cartTotal,
    clearCart,
    removeFromCart,
    addTransaction,
    showSnackbar,
  ]);

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
        </Stack>
      </Container>

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
      />

      {cartFlights.map((flight) => (
        <Box
          key={flight.id}
          sx={{
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1202,
            pointerEvents: "none",
            transform: `translate(${flight.startX}px, ${flight.startY}px)`,
          }}
        >
          <Box
            sx={{
              px: 1.2,
              py: 0.7,
              borderRadius: 999,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.28)",
              typography: "caption",
              fontWeight: 700,
              maxWidth: 160,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transform: flight.active
                ? `translate(${flight.deltaX}px, ${flight.deltaY}px) scale(0.46)`
                : "translate(0px, 0px) scale(1)",
              opacity: flight.active ? 0.16 : 0.98,
              transition: `${CART_FLIGHT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              transformOrigin: "center",
            }}
          >
            {flight.label}
          </Box>
        </Box>
      ))}

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
