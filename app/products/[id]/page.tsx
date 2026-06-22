"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  unit: string | null;
  description: string | null;
  cost: number;
  markupPct: number;
  bundleQty: number | null;
  bundleMarkdownPct: number | null;
  bundlePrice: number | null;
  price: number;
  stock: number;
};

type ProductForm = {
  sku: string;
  name: string;
  unit: string;
  description: string;
  cost: string;
  markupPercent: string;
  price: string;
  stock: string;
};

const INITIAL_FORM: ProductForm = {
  sku: "",
  name: "",
  unit: "",
  description: "",
  cost: "0",
  markupPercent: "0",
  price: "0",
  stock: "0",
};

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = useMemo(() => params?.id ?? "", [params]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bundleQty, setBundleQty] = useState<number | null>(null);
  const [bundleMarkdownPercent, setBundleMarkdownPercent] = useState<
    number | null
  >(null);
  const [bundlePrice, setBundlePrice] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);

  useEffect(() => {
    if (!productId) return;

    const controller = new AbortController();

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/products/${productId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load product");
        }

        const data = (await response.json()) as ProductDetail;
        setForm({
          sku: data.sku ?? "",
          name: data.name ?? "",
          unit: data.unit ?? "",
          description: data.description ?? "",
          cost: String(data.cost ?? 0),
          markupPercent: String(data.markupPct ?? 0),
          price: String(data.price ?? 0),
          stock: String(data.stock ?? 0),
        });
        setBundleQty(data.bundleQty);
        setBundleMarkdownPercent(data.bundleMarkdownPct);
        setBundlePrice(data.bundlePrice);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError("Unable to load product");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();

    return () => controller.abort();
  }, [productId]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: form.sku,
          name: form.name,
          unit: form.unit,
          description: form.description,
          cost: Number(form.cost),
          markupPercent: Number(form.markupPercent),
          bundleQty,
          bundleMarkdownPercent,
          bundlePrice,
          price: Number(form.price),
          stock: Number(form.stock),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Unable to save product");
      }

      setSuccess("Product updated");
      router.push("/");
      router.refresh();
    } catch (saveError) {
      setError((saveError as Error).message || "Unable to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <div className="mx-auto max-w-xl px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-2 text-3 font-medium dark:bg-white/10"
        >
          <ChevronLeftIcon className="size-4" />
          Back
        </button>

        <h1 className="text-8 font-semibold">Edit Product</h1>

        {loading ? (
          <p className="mt-4 text-4 text-[#8e8e93]">Loading product...</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-3 text-[#8e8e93]">SKU</span>
              <input
                value={form.sku}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    sku: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-3 text-[#8e8e93]">Name</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-3 text-[#8e8e93]">Unit</span>
              <input
                value={form.unit}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    unit: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-3 text-[#8e8e93]">Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      price: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-3 text-[#8e8e93]">Stock</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      stock: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-3 text-[#8e8e93]">Cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      cost: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-3 text-[#8e8e93]">
                  Markup %
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.markupPercent}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      markupPercent: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-3 text-[#8e8e93]">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-4 outline-none focus:border-black/20 dark:border-white/15 dark:focus:border-white/30"
              />
            </label>

            {error && <p className="text-3 text-red-500">{error}</p>}
            {success && <p className="text-3 text-emerald-600">{success}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-foreground px-4 py-3 text-4 font-semibold text-background disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
