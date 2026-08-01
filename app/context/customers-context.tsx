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
import type { Customer } from "@/types/customer";

type CustomersContextType = {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  refreshCustomers: () => Promise<void>;
  createCustomer: (input: {
    name: string;
    phone?: string;
    note?: string;
  }) => Promise<Customer>;
};

const CustomersContext = createContext<CustomersContextType | undefined>(
  undefined,
);

function sortCustomers(customers: Customer[]) {
  return [...customers].sort((left, right) => left.name.localeCompare(right.name));
}

// Shared across the checkout drawer's "Pending" flow, the Sales page's
// customer-assignment action, and anywhere else that needs to pick from (or
// create) a customer — a single fetch instead of every consumer refetching
// its own copy of the roster.
export function CustomersProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCustomers = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/customers", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load customers");
      }

      setCustomers(sortCustomers(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load customers",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await refreshCustomers();
    };
    void run();
  }, [refreshCustomers]);

  const createCustomer = useCallback(
    async (input: { name: string; phone?: string; note?: string }) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to add customer");
      }

      const newCustomer = { ...data, balance: 0 } as Customer;
      setCustomers((current) => sortCustomers([...current, newCustomer]));
      return newCustomer;
    },
    [],
  );

  const value = useMemo(
    () => ({ customers, loading, error, refreshCustomers, createCustomer }),
    [customers, loading, error, refreshCustomers, createCustomer],
  );

  return (
    <CustomersContext.Provider value={value}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const context = useContext(CustomersContext);

  if (!context) {
    throw new Error("useCustomers must be used within CustomersProvider");
  }

  return context;
}
