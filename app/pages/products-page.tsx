"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import AppSnackbar from "@/app/components/app-snackbar";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import CheckoutDrawer from "@/app/components/checkout-drawer";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useCart } from "@/app/context/cart-context";
import { useCheckoutCalculations } from "@/app/hooks/use-checkout-calculations";
import { usePageContext } from "@/app/context/page-context";
import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    items: Array.isArray(transaction.items) ? transaction.items : [],
  };
}

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [refreshToken, setRefreshToken] = useState(0);
  const [analysisTimeMs] = useState(() => Date.now());
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
  }, [refreshToken]);

  useEffect(() => {
    let active = true;

    const loadTransactions = async () => {
      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const items: Transaction[] = (
          Array.isArray(data) ? data : (data.items ?? [])
        ).map(normalizeTransaction);

        if (active) {
          setTransactions(items);
        }
      } catch {
        if (active) {
          setTransactions([]);
        }
      }
    };

    loadTransactions();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    const handlePullToRefresh = () => {
      setRefreshToken((current) => current + 1);
    };

    window.addEventListener("app:pull-to-refresh", handlePullToRefresh);
    return () => {
      window.removeEventListener("app:pull-to-refresh", handlePullToRefresh);
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

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCart({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        quantity: 1,
      });

      showSnackbar({ message: `${product.name} added to cart` });
    },
    [addToCart, showSnackbar],
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

          {!loading && !error && popularItems.items.length > 0 ? (
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Popular Items
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Adaptive ${popularItems.selectedWindowDays}d window`}
                    />
                  </Stack>

                  <Stack divider={<Divider flexItem />}>
                    {popularItems.items.map((item, index) => (
                      <Stack
                        key={item.productName}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ py: 1 }}
                        spacing={1}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                            noWrap
                          >
                            {index + 1}. {item.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.orderCount} orders
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.quantitySold} sold
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ₱{item.revenue.toFixed(2)}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          <ProductsCatalog
            products={filteredProducts}
            loading={loading}
            error={error}
            onAddToCart={handleAddToCart}
          />
        </Stack>
      </Container>

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
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
