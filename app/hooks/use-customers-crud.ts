import { useCallback, useEffect, useMemo, useState } from "react";
import type { Customer } from "@/types/customer";

export type CustomerFormState = {
  name: string;
  phone: string;
  note: string;
};

const EMPTY_FORM: CustomerFormState = { name: "", phone: "", note: "" };

type ShowSnackbar = (options: {
  message: string;
  severity?: "success" | "info" | "warning" | "error";
}) => void;

// Owns the customer list (fetch/search/sort) plus the Add/Edit form state
// and their submit handlers. Detail-view state (which customer is selected)
// and order-management handlers live in the page and a sibling hook — this
// one only knows about Customer records themselves.
export function useCustomersCrud(showSnackbar: ShowSnackbar) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customers", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load customers");
      }
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadCustomers();
    };
    void run();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? customers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(query) ||
            (customer.phone ?? "").toLowerCase().includes(query),
        )
      : customers;

    return [...list].sort((left, right) => {
      if (left.balance !== right.balance) {
        return right.balance - left.balance;
      }
      return left.name.localeCompare(right.name);
    });
  }, [customers, search]);

  const handleOpenAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setNameError(null);
    setAddOpen(true);
  }, []);

  const handleOpenEdit = useCallback((customer: Customer) => {
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      note: customer.note ?? "",
    });
    setNameError(null);
    setEditOpen(true);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) {
      setNameError("A name is required");
      return;
    }
    setNameError(null);

    setSaving(true);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          note: form.note.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to add customer");
      }
      setAddOpen(false);
      await loadCustomers();
      showSnackbar({ message: `Added ${data.name}` });
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Unable to add customer",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [form, loadCustomers, showSnackbar]);

  const handleEdit = useCallback(
    async (customerId: string) => {
      if (!form.name.trim()) {
        setNameError("A name is required");
        return;
      }
      setNameError(null);

      setSaving(true);
      try {
        const response = await fetch("/api/customers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: customerId,
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            note: form.note.trim() || null,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "Unable to update customer");
        }
        setEditOpen(false);
        await loadCustomers();
      } catch (err) {
        showSnackbar({
          message:
            err instanceof Error ? err.message : "Unable to update customer",
          severity: "error",
        });
      } finally {
        setSaving(false);
      }
    },
    [form, loadCustomers, showSnackbar],
  );

  return {
    customers,
    loading,
    error,
    search,
    setSearch,
    filteredCustomers,
    loadCustomers,
    addOpen,
    setAddOpen,
    editOpen,
    setEditOpen,
    form,
    setForm,
    nameError,
    setNameError,
    saving,
    handleOpenAdd,
    handleOpenEdit,
    handleAdd,
    handleEdit,
  };
}
