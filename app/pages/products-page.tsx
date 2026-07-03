"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Badge from "@mui/material/Badge";
import SearchIcon from "@mui/icons-material/Search";
import AddShoppingCartRounded from "@mui/icons-material/AddShoppingCartRounded";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { useCart } from "@/app/context/cart-context";
import { usePageContext } from "@/app/context/page-context";

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  stock: number | string;
};

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
  const [paidAmountInput, setPaidAmountInput] = useState<string | null>(null);

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
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name.toLowerCase();
      const sku = product.sku.toLowerCase();
      return name.includes(query) || sku.includes(query);
    });
  }, [products, searchQuery]);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      quantity: 1,
    });

    setSnackbarMessage(`${product.name} added to cart`);
    setSnackbarOpen(true);
  };

  const handleCartFabClick = () => {
    setPaidAmountInput(null);
    setCartOpen(true);
  };

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const suggestedAmounts = useMemo(() => {
    if (cartTotal <= 0) {
      return [];
    }

    const denominations = [20, 50, 100, 200, 500, 1000];
    while (denominations[denominations.length - 1] < cartTotal) {
      denominations.push(denominations[denominations.length - 1] * 2);
    }

    const startIndex = Math.max(
      0,
      denominations.findIndex((amount) => amount >= cartTotal),
    );

    return denominations.slice(startIndex, startIndex + 4);
  }, [cartTotal]);

  const nextSuggestedAmount = useMemo(
    () => suggestedAmounts.find((amount) => amount >= cartTotal) ?? cartTotal,
    [suggestedAmounts, cartTotal],
  );

  const autoPaidAmountInput =
    cartOpen && cartTotal > 0 ? nextSuggestedAmount.toFixed(2) : "";
  const activePaidAmountInput = paidAmountInput ?? autoPaidAmountInput;

  const parsedPaidAmount = useMemo(() => {
    const sanitized = activePaidAmountInput.replace(/,/g, "").trim();
    if (!sanitized) {
      return 0;
    }

    const numeric = Number(sanitized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [activePaidAmountInput]);

  const changeAmount = useMemo(
    () => Math.max(0, parsedPaidAmount - cartTotal),
    [parsedPaidAmount, cartTotal],
  );

  const amountDue = useMemo(
    () => Math.max(0, cartTotal - parsedPaidAmount),
    [cartTotal, parsedPaidAmount],
  );

  const handleCheckout = async () => {
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

      const soldById = new Map<string, number>();
      for (const item of cartItems) {
        soldById.set(item.id, (soldById.get(item.id) ?? 0) + item.quantity);
      }

      setProducts((prev) =>
        prev.map((product) => {
          const sold = soldById.get(product.id) ?? 0;
          if (sold <= 0) {
            return product;
          }

          const nextStock = Math.max(0, Number(product.stock) - sold);
          return {
            ...product,
            stock: nextStock,
          };
        }),
      );

      clearCart();
      setPaidAmountInput(null);
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
  };

  return (
    <MobilePageWrapper title="Products">
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              pt: 1,
              pb: 1,
              bgcolor: "background.default",
            }}
          >
            <Paper
              sx={{
                p: "2px 6px",
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <InputBase
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                sx={{ ml: 1, flex: 1 }}
                placeholder="Search products"
                inputProps={{ "aria-label": "search products" }}
              />
              <IconButton type="button" sx={{ p: 1 }} aria-label="search">
                <SearchIcon fontSize="small" />
              </IconButton>
            </Paper>
          </Box>

          <Box sx={{ px: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {loading
                ? "Loading products..."
                : `${filteredProducts.length.toLocaleString()} products`}
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : filteredProducts.length === 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  No products found.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List disablePadding>
              {filteredProducts.map((product) => (
                <ListItem key={product.id} disablePadding sx={{ mb: 1 }}>
                  <Card variant="outlined" sx={{ width: "100%" }}>
                    <CardContent
                      sx={{
                        py: 1.25,
                        "&:last-child": {
                          pb: 1.25,
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 600, lineHeight: 1.3 }}
                          >
                            {product.name}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={0.75}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ mt: 0.8 }}
                          >
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`SKU: ${product.sku}`}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`Stock: ${Number(product.stock)}`}
                            />
                          </Stack>
                        </Box>

                        <Stack alignItems="flex-end" spacing={0.5}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                          >
                            ₱{Number(product.price).toFixed(2)}
                          </Typography>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleAddToCart(product)}
                            aria-label={`add ${product.name} to cart`}
                          >
                            <AddShoppingCartRounded fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </ListItem>
              ))}
            </List>
          )}
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

      <Drawer
        anchor="bottom"
        open={cartOpen}
        onClose={() => {
          setCartOpen(false);
          setPaidAmountInput(null);
        }}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            pb: "env(safe-area-inset-bottom)",
            maxHeight: "78vh",
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">Cart</Typography>
            <IconButton
              onClick={() => {
                setCartOpen(false);
                setPaidAmountInput(null);
              }}
              aria-label="close cart"
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </Typography>
        </Box>

        <Divider />

        <List sx={{ px: 1, overflowY: "auto" }}>
          {cartItems.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Your cart is empty"
                secondary="Add products from the list to start checkout."
              />
            </ListItem>
          ) : (
            cartItems.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`remove ${item.name}`}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={item.name}
                  secondary={`${item.sku} · ₱${item.price.toFixed(2)}`}
                />
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ mr: 2 }}
                >
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label={`decrease ${item.name}`}
                  >
                    <RemoveRounded fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 20, textAlign: "center" }}
                  >
                    {item.quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label={`increase ${item.name}`}
                  >
                    <AddRounded fontSize="small" />
                  </IconButton>
                </Stack>
              </ListItem>
            ))
          )}
        </List>

        <Divider />

        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mb: 1.25 }}
          >
            <Typography variant="subtitle2">Total</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              ₱{cartTotal.toFixed(2)}
            </Typography>
          </Stack>

          <TextField
            fullWidth
            size="small"
            type="number"
            label="Amount Paid"
            value={activePaidAmountInput}
            onChange={(event) => setPaidAmountInput(event.target.value)}
            inputProps={{
              min: 0,
              step: "0.01",
              inputMode: "decimal",
            }}
          />

          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 1 }}
          >
            {suggestedAmounts.map((amount) => (
              <Chip
                key={amount}
                size="small"
                clickable
                label={`₱${amount.toLocaleString()}`}
                onClick={() => setPaidAmountInput(amount.toFixed(2))}
              />
            ))}
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 1.25, mb: 1.25 }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {amountDue > 0 ? "Amount Due" : "Change"}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              color={amountDue > 0 ? "error.main" : "success.main"}
            >
              ₱{(amountDue > 0 ? amountDue : changeAmount).toFixed(2)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              disabled={cartItems.length === 0 || checkoutLoading}
              onClick={() => {
                clearCart();
                setPaidAmountInput(null);
              }}
            >
              Clear
            </Button>
            <Button
              fullWidth
              variant="contained"
              disabled={
                cartItems.length === 0 ||
                checkoutLoading ||
                parsedPaidAmount < cartTotal
              }
              onClick={handleCheckout}
            >
              {checkoutLoading ? "Processing..." : "Checkout"}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </MobilePageWrapper>
  );
}
