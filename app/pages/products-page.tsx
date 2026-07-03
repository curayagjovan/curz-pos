"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import AddShoppingCartRounded from "@mui/icons-material/AddShoppingCartRounded";
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
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

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
    </MobilePageWrapper>
  );
}
