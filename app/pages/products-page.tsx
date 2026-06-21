"use client";

import { useEffect, useState } from "react";
import { List, ListItem } from "konsta/react";
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
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products;

  useEffect(() => {
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch("/api/products", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

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

    void loadProducts();

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
    >
      <List strongIos inset>
        {isLoadingProducts && <ListItem title="Loading product list..." />}

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
