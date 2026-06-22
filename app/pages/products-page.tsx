"use client";

import { useEffect, useState } from "react";
import { List, ListItem, Preloader } from "konsta/react";
import PageContainer from "../components/page-container";

type ProductListItem = {
  id: string;
  name: string;
  price: number | string;
  sku: string;
  description?: string;
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatPrice(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) {
    return "-";
  }

  return CURRENCY_FORMATTER.format(parsed);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products;

  const refreshProducts = async () => {
    try {
      setIsRefreshingProducts(true);
      setProductsError(null);

      const response = await fetch("/api/products", { cache: "no-store" });

      if (!response.ok) throw new Error("Failed to load products");

      const data = (await response.json()) as ProductListItem[];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load products", error);
      setProductsError("Unable to load products");
      setProducts([]);
    } finally {
      setIsRefreshingProducts(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const initialLoad = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch("/api/products", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to load products");

        const data = (await response.json()) as ProductListItem[];
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Unable to load products", error);
          setProductsError("Unable to load products");
          setProducts([]);
        }
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void initialLoad();

    return () => controller.abort();
  }, []);

  return (
    <PageContainer
      subtitle={
        isLoadingProducts
          ? "Loading products..."
          : `${filteredProducts.length} Products`
      }
      onSearch={setSearchQuery}
      onRefresh={refreshProducts}
      isRefreshing={isRefreshingProducts}
    >
      <List strongIos inset>
        {isLoadingProducts && (
          <div
            className="pointer-events-none sticky top-[max(16px,var(--k-safe-area-top))] z-20 flex justify-center"
            style={{
              transition: "opacity 180ms ease, transform 180ms ease",
            }}
          >
            <div className="rounded-full  px-3 py-2 shadow-sm backdrop-blur-sm ">
              <Preloader className="scale-75" />
            </div>
          </div>
        )}

        {!isLoadingProducts && productsError && (
          <ListItem title={productsError} />
        )}

        {!isLoadingProducts && !productsError && products.length === 0 && (
          <ListItem title="No products yet" />
        )}

        {!isLoadingProducts &&
          !productsError &&
          products.length > 0 &&
          filteredProducts.length === 0 && (
            <ListItem title="No products match your search" />
          )}

        {!isLoadingProducts &&
          !productsError &&
          filteredProducts.map((product) => (
            <ListItem
              key={product.id}
              media={
                <div className="flex size-9 items-center justify-center rounded-xl bg-black/5 text-3 font-semibold text-(--muted) dark:bg-white/10">
                  {product.sku.slice(0, 2).toUpperCase()}
                </div>
              }
              title={product.name}
              text={product.sku}
              after={formatPrice(product.price)}
            />
          ))}
      </List>
    </PageContainer>
  );
}
