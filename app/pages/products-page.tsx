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
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import AppSnackbar from "@/app/components/app-snackbar";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
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
import { useCheckoutCalculations } from "@/app/hooks/use-checkout-calculations";
import { useSenderPushEndpoint } from "@/app/hooks/use-sender-push-endpoint";
import { usePageContext } from "@/app/context/page-context";
import type { ProductCategoryValue } from "@/lib/product-categories";
import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";
import Divider from "@mui/material/Divider";

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
  const { searchQuery, setSearchQuery, setCurrentPage } = usePageContext();
  const {
    addToCart,
    cartItems,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
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
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingCheckoutLoading, setPendingCheckoutLoading] = useState(false);
  const [checkoutCooldown, setCheckoutCooldown] = useState(false);
  const [paidAmountInput, setPaidAmountInput] = useState("0");
  const [analysisTimeMs] = useState(() => Date.now());
  const [isCartPulseVisible, setIsCartPulseVisible] = useState(false);
  const [cartFlights, setCartFlights] = useState<CartFlight[]>([]);
  const cartPulseTimeoutRef = useRef<number | null>(null);
  const checkoutCooldownTimeoutRef = useRef<number | null>(null);
  const cartFabRef = useRef<HTMLButtonElement | null>(null);
  const senderPushEndpointRef = useSenderPushEndpoint();
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

      if (checkoutCooldownTimeoutRef.current !== null) {
        window.clearTimeout(checkoutCooldownTimeoutRef.current);
      }

      for (const frameId of cartFlightFrameRef.current) {
        window.cancelAnimationFrame(frameId);
      }

      for (const timeoutId of cartFlightTimeoutRef.current) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

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

  const popularItems = useMemo(() => {
    const paidTransactions = transactions.filter(
      (transaction) => transaction.status === "PAID",
    );
    const DAY_MS = 24 * 60 * 60 * 1000;

    const computeWindow = (selectedWindowDays: number) => {
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
        (item) => item.quantitySold >= 3 && item.orderCount >= 2,
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

      return {
        selectedWindowDays,
        totalPaidOrdersInWindow: windowOrderCount,
        items: rankedEligibleItems,
      };
    };

    // Tuned against real sales history (typically 20-45 paid orders/day): a
    // 1-day window usually yields fewer than five qualifying products, so
    // widen to 2 days whenever a single day can't fill the section.
    const oneDay = computeWindow(1);
    if (oneDay.items.length >= 5) {
      return oneDay;
    }
    const twoDay = computeWindow(2);
    return twoDay.items.length > oneDay.items.length ? twoDay : oneDay;
  }, [analysisTimeMs, transactions]);

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
    },
    [addToCart, triggerCartPulse],
  );

  const [paidAmountTouched, setPaidAmountTouched] = useState(false);
  const [autoPaidTotal, setAutoPaidTotal] = useState<number | null>(null);

  const handleCartFabClick = useCallback(() => {
    setPaidAmountTouched(false);
    setAutoPaidTotal(null);
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

  // Prefill the paid amount with the cart total (exact payment is the common
  // case) and keep it following the total while quantities change in the
  // drawer, until the cashier types or taps an amount themselves.
  if (cartOpen && !paidAmountTouched && autoPaidTotal !== cartTotal) {
    setAutoPaidTotal(cartTotal);
    setPaidAmountInput(cartTotal > 0 ? cartTotal.toFixed(2) : "0");
  }

  const handlePaidAmountChange = useCallback((value: string) => {
    setPaidAmountTouched(true);
    setPaidAmountInput(value);
  }, []);

  const startCheckoutCooldown = useCallback(() => {
    if (checkoutCooldownTimeoutRef.current !== null) {
      window.clearTimeout(checkoutCooldownTimeoutRef.current);
    }

    setCheckoutCooldown(true);
    checkoutCooldownTimeoutRef.current = window.setTimeout(() => {
      setCheckoutCooldown(false);
      checkoutCooldownTimeoutRef.current = null;
    }, 500);
  }, []);

  // Shared by the normal "Checkout" button (status PAID, full payment
  // required) and the "Item Taken, Unpaid" button (status PENDING — the
  // customer walks off with the item before payment is settled). Only the
  // validation and the resulting order status differ between the two.
  const submitCheckout = useCallback(
    async (
      status: "PAID" | "PENDING",
      pendingDetails?: { customerId: string; amountPaid: number },
    ) => {
      if (checkoutCooldown) {
        showSnackbar({
          message: "Please wait a moment before checking out again",
          severity: "info",
        });
        return;
      }

      if (cartItems.length === 0) {
        showSnackbar({ message: "Cart is empty", severity: "error" });
        return;
      }

      if (status === "PAID" && parsedPaidAmount < cartTotal) {
        showSnackbar({
          message: "Insufficient payment amount",
          severity: "error",
        });
        return;
      }

      if (status === "PENDING" && !pendingDetails?.customerId) {
        showSnackbar({
          message: "Select a customer for unpaid sales",
          severity: "error",
        });
        return;
      }

      const setLoading =
        status === "PAID" ? setCheckoutLoading : setPendingCheckoutLoading;

      setLoading(true);
      startCheckoutCooldown();
      showSnackbar({
        message:
          status === "PAID" ? "Saving checkout..." : "Saving pending sale...",
        severity: "info",
      });

      try {
        const requestId = crypto.randomUUID();
        const payload = {
          requestId,
          status,
          amountPaid:
            status === "PENDING" ? pendingDetails!.amountPaid : parsedPaidAmount,
          customerId:
            status === "PENDING" ? pendingDetails!.customerId : undefined,
          senderPushEndpoint: senderPushEndpointRef.current,
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

        const savedTransaction = data as Partial<Transaction>;
        if (
          !savedTransaction ||
          typeof savedTransaction.id !== "string" ||
          typeof savedTransaction.orderNo !== "string" ||
          typeof savedTransaction.createdAt !== "string" ||
          !Array.isArray(savedTransaction.items)
        ) {
          throw new Error("Checkout not yet confirmed. Please try again.");
        }

        addTransaction(savedTransaction as Transaction);
        void refreshTransactions(false);

        clearCart();
        setPaidAmountInput("0");
        setCartOpen(false);
        setSearchQuery("");
        showSnackbar({
          message: data?.orderNo
            ? status === "PAID"
              ? `Order ${data.orderNo} completed`
              : `Order ${data.orderNo} marked pending — payment not yet received`
            : status === "PAID"
              ? "Checkout completed"
              : "Sale marked pending",
        });
      } catch (err) {
        showSnackbar({
          message:
            err instanceof Error ? err.message : "Unable to complete checkout",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      cartItems,
      senderPushEndpointRef,
      parsedPaidAmount,
      cartTotal,
      clearCart,
      removeFromCart,
      addTransaction,
      refreshTransactions,
      showSnackbar,
      checkoutCooldown,
      startCheckoutCooldown,
      setSearchQuery,
    ],
  );

  const handleCheckout = useCallback(
    () => submitCheckout("PAID"),
    [submitCheckout],
  );
  const handleCheckoutPending = useCallback(
    (details: { customerId: string; amountPaid: number }) =>
      submitCheckout("PENDING", details),
    [submitCheckout],
  );

  const handleCloseCart = useCallback(() => {
    setCartOpen(false);
    setPaidAmountInput("0");
  }, []);

  const handleClearCart = useCallback(() => {
    clearCart();
    setPaidAmountInput("0");
  }, [clearCart]);

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
