"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getProducts as getCachedProducts,
  saveProducts as saveCachedProducts,
  shouldRefresh,
} from "@/lib/products-db";
import type { Product } from "@/types/product";

type ProductsContextType = {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: (force?: boolean) => Promise<void>;
  upsertProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  togglePin: (productId: string, isPinned: boolean) => Promise<void>;
};

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined,
);

function sortProducts(products: Product[]) {
  return [...products].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async (force = false) => {
    if (force) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/products?skip=0&limit=9999", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      const items: Product[] = Array.isArray(data) ? data : (data.items ?? []);
      const nextProducts = sortProducts(items);

      setProducts(nextProducts);
      await saveCachedProducts(nextProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const cachedProducts = await getCachedProducts();

        if (!active) {
          return;
        }

        if (cachedProducts.length > 0) {
          setProducts(sortProducts(cachedProducts));
          setLoading(false);
        }

        if (cachedProducts.length === 0 || shouldRefresh()) {
          await refreshProducts(cachedProducts.length === 0);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load products",
        );
        setLoading(false);
      }
    };

    hydrateProducts();

    return () => {
      active = false;
    };
  }, [refreshProducts]);

  useEffect(() => {
    const handlePullToRefresh = () => {
      void refreshProducts(true);
    };

    window.addEventListener("app:pull-to-refresh", handlePullToRefresh);
    return () => {
      window.removeEventListener("app:pull-to-refresh", handlePullToRefresh);
    };
  }, [refreshProducts]);

  const upsertProduct = useCallback((product: Product) => {
    setProducts((current) => {
      const existingIndex = current.findIndex((item) => item.id === product.id);
      const nextProducts = [...current];

      if (existingIndex === -1) {
        nextProducts.push(product);
      } else {
        nextProducts[existingIndex] = product;
      }

      const sortedProducts = sortProducts(nextProducts);
      void saveCachedProducts(sortedProducts);
      return sortedProducts;
    });
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setProducts((current) => {
      const nextProducts = current.filter(
        (product) => product.id !== productId,
      );
      void saveCachedProducts(nextProducts);
      return nextProducts;
    });
  }, []);

  // Optimistic — flips the flag locally (so the Pinned section reacts
  // instantly) and rolls back if the PATCH fails, rather than waiting on
  // the network before a cashier sees the toggle take effect.
  const togglePin = useCallback(
    async (productId: string, isPinned: boolean) => {
      let previousProduct: Product | undefined;

      setProducts((current) => {
        const nextProducts = current.map((product) => {
          if (product.id !== productId) {
            return product;
          }
          previousProduct = product;
          return { ...product, isPinned };
        });
        void saveCachedProducts(nextProducts);
        return nextProducts;
      });

      try {
        const response = await fetch(`/api/products/${productId}/pin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned }),
        });

        if (!response.ok) {
          throw new Error("Failed to update pin");
        }
      } catch (err) {
        if (previousProduct) {
          const restored = previousProduct;
          setProducts((current) => {
            const nextProducts = current.map((product) =>
              product.id === productId ? restored : product,
            );
            void saveCachedProducts(nextProducts);
            return nextProducts;
          });
        }
        throw err instanceof Error ? err : new Error("Failed to update pin");
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      products,
      loading,
      error,
      refreshProducts,
      upsertProduct,
      removeProduct,
      togglePin,
    }),
    [
      products,
      loading,
      error,
      refreshProducts,
      upsertProduct,
      removeProduct,
      togglePin,
    ],
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error("useProducts must be used within ProductsProvider");
  }

  return context;
}
