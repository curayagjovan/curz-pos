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
import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";

type LoadItemsContextType = {
  loadItems: LoadCatalogItem[];
  loading: boolean;
  error: string | null;
  refreshLoadItems: () => Promise<void>;
  upsertLoadItem: (item: LoadCatalogItem) => void;
  removeLoadItem: (id: string) => void;
};

type RawLoadItem = {
  id: string;
  sku: string;
  brand: string;
  group: string;
  category: string;
  code: string;
  amount: number | string;
  label: string;
  description: string | null;
};

const LoadItemsContext = createContext<LoadItemsContextType | undefined>(
  undefined,
);

function mapLoadItem(raw: RawLoadItem): LoadCatalogItem {
  return {
    id: raw.id,
    sku: raw.sku,
    brand: raw.brand as LoadCatalogItem["brand"],
    group: raw.group as LoadCatalogItem["group"],
    category: raw.category === "DATA_PROMO" ? "Data Promo" : "Regular Load",
    code: raw.code,
    amount: Number(raw.amount),
    label: raw.label,
    description: raw.description ?? undefined,
  };
}

function sortLoadItems(items: LoadCatalogItem[]) {
  return [...items].sort((left, right) => {
    if (left.brand !== right.brand) {
      return left.brand.localeCompare(right.brand);
    }
    return left.amount - right.amount;
  });
}

export function LoadItemsProvider({ children }: { children: ReactNode }) {
  const [loadItems, setLoadItems] = useState<LoadCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLoadItems = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/load-items", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch load items");
      }

      const data = (await response.json()) as RawLoadItem[];
      setLoadItems(sortLoadItems(data.map(mapLoadItem)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load load items",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateLoadItems = async () => {
      if (active) {
        await refreshLoadItems();
      }
    };

    void hydrateLoadItems();

    return () => {
      active = false;
    };
  }, [refreshLoadItems]);

  const upsertLoadItem = useCallback((item: LoadCatalogItem) => {
    setLoadItems((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === item.id);
      const next = [...current];

      if (existingIndex === -1) {
        next.push(item);
      } else {
        next[existingIndex] = item;
      }

      return sortLoadItems(next);
    });
  }, []);

  const removeLoadItem = useCallback((id: string) => {
    setLoadItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      loadItems,
      loading,
      error,
      refreshLoadItems,
      upsertLoadItem,
      removeLoadItem,
    }),
    [loadItems, loading, error, refreshLoadItems, upsertLoadItem, removeLoadItem],
  );

  return (
    <LoadItemsContext.Provider value={value}>
      {children}
    </LoadItemsContext.Provider>
  );
}

export function useLoadItems() {
  const context = useContext(LoadItemsContext);

  if (!context) {
    throw new Error("useLoadItems must be used within LoadItemsProvider");
  }

  return context;
}
