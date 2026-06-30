"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import {
  Block,
  BlockTitle,
  Button,
  List,
  ListInput,
  Navbar,
  Popup,
  Preloader,
} from "konsta/react";

type ProductResponse = {
  id: string;
  sku: string;
  name: string;
  unit: string | null;
  description: string | null;
  cost: number | string;
  markupPct: number | string;
  bundleQty: number | null;
  bundleMarkdownPct: number | string | null;
  bundlePrice: number | string | null;
  price: number | string;
  stock: number;
};

type FormValues = {
  sku: string;
  name: string;
  unit: string;
  description: string;
  cost: string;
  markupPercent: string;
  bundleQty: string;
  bundleMarkdownPercent: string;
  bundlePrice: string;
  price: string;
  stock: string;
};

type ProductEditPopupProps = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const EMPTY_FORM: FormValues = {
  sku: "",
  name: "",
  unit: "",
  description: "",
  cost: "0.00",
  markupPercent: "0",
  bundleQty: "",
  bundleMarkdownPercent: "",
  bundlePrice: "",
  price: "0.00",
  stock: "0",
};

function toNumberString(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? "" : String(parsed);
}

function toCurrencyString(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return "";
  }

  return parsed.toFixed(2);
}

export default function ProductEditPopup({
  open,
  productId,
  onClose,
  onSaved,
}: ProductEditPopupProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasProductId = useMemo(() => Boolean(productId), [productId]);

  useEffect(() => {
    if (!open || !hasProductId || !productId) {
      return;
    }

    let isCancelled = false;

    const loadProduct = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(productId)}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message || "Unable to load product");
        }

        const product = (await response.json()) as ProductResponse;
        if (isCancelled) {
          return;
        }

        setFormValues({
          sku: product.sku || "",
          name: product.name || "",
          unit: product.unit || "",
          description: product.description || "",
          cost: toCurrencyString(product.cost) || "0.00",
          markupPercent: toNumberString(product.markupPct) || "0",
          bundleQty: toNumberString(product.bundleQty),
          bundleMarkdownPercent: toNumberString(product.bundleMarkdownPct),
          bundlePrice: toCurrencyString(product.bundlePrice),
          price: toCurrencyString(product.price) || "0.00",
          stock: toNumberString(product.stock) || "0",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unable to load product";
        setErrorMessage(message);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isCancelled = true;
    };
  }, [open, hasProductId, productId]);

  const updateField = (field: keyof FormValues, value: string) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!productId || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        sku: formValues.sku,
        name: formValues.name,
        unit: formValues.unit,
        description: formValues.description,
        cost: Number(formValues.cost || 0),
        markupPercent: Number(formValues.markupPercent || 0),
        bundleQty:
          formValues.bundleQty.trim() === ""
            ? null
            : Number(formValues.bundleQty),
        bundleMarkdownPercent:
          formValues.bundleMarkdownPercent.trim() === ""
            ? null
            : Number(formValues.bundleMarkdownPercent),
        bundlePrice:
          formValues.bundlePrice.trim() === ""
            ? null
            : Number(formValues.bundlePrice),
        price: Number(formValues.price || 0),
        stock: Number(formValues.stock || 0),
      };

      const response = await fetch(
        `/api/products/${encodeURIComponent(productId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message || "Unable to save product");
      }

      await onSaved();
      setSuccessMessage("Product updated successfully.");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save product";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <Popup opened={open} backdrop>
      <div className="flex h-full w-full flex-col overflow-y-auto bg-[#f7f7fa] pt-[max(env(safe-area-inset-top),8px)] dark:bg-[#0b0b0d]">
        <Navbar
          title="Edit Product"
          left={
            <Button clear onClick={onClose}>
              Cancel
            </Button>
          }
          right={
            <Button clear disabled={isSaving || isLoading} onClick={handleSave}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          }
        />

        {!hasProductId ? (
          <Block className="pt-6 text-center text-sm font-medium text-red-500">
            Missing product ID.
          </Block>
        ) : isLoading ? (
          <Block className="flex min-h-[50vh] items-center justify-center">
            <Preloader />
          </Block>
        ) : (
          <div className="pb-[calc(88px+env(safe-area-inset-bottom))]">
            <BlockTitle>Basic Info</BlockTitle>
            <List inset strongIos>
              <ListInput
                label="SKU"
                type="text"
                value={formValues.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                clearButton
              />
              <ListInput
                label="Name"
                type="text"
                value={formValues.name}
                onChange={(e) => updateField("name", e.target.value)}
                clearButton
              />
              <ListInput
                label="Unit"
                type="text"
                value={formValues.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              />
              <ListInput
                label="Description"
                type="textarea"
                value={formValues.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </List>

            <BlockTitle>Pricing</BlockTitle>
            <List inset strongIos>
              <ListInput
                label="Cost"
                type="number"
                inputMode="decimal"
                value={formValues.cost}
                onChange={(e) => updateField("cost", e.target.value)}
              />
              <ListInput
                label="Markup %"
                type="number"
                inputMode="decimal"
                value={formValues.markupPercent}
                onChange={(e) => updateField("markupPercent", e.target.value)}
              />
              <ListInput
                label="Price"
                type="number"
                inputMode="decimal"
                value={formValues.price}
                onChange={(e) => updateField("price", e.target.value)}
              />
              <ListInput
                label="Stock"
                type="number"
                inputMode="numeric"
                value={formValues.stock}
                onChange={(e) => updateField("stock", e.target.value)}
              />
            </List>

            <BlockTitle>Bundle (Optional)</BlockTitle>
            <List inset strongIos>
              <ListInput
                label="Bundle Qty"
                type="number"
                inputMode="numeric"
                value={formValues.bundleQty}
                onChange={(e) => updateField("bundleQty", e.target.value)}
              />
              <ListInput
                label="Bundle Markdown %"
                type="number"
                inputMode="decimal"
                value={formValues.bundleMarkdownPercent}
                onChange={(e) =>
                  updateField("bundleMarkdownPercent", e.target.value)
                }
              />
              <ListInput
                label="Bundle Price"
                type="number"
                inputMode="decimal"
                value={formValues.bundlePrice}
                onChange={(e) => updateField("bundlePrice", e.target.value)}
              />
            </List>

            {errorMessage ? (
              <Block className="pt-2 text-sm font-medium text-red-500">
                {errorMessage}
              </Block>
            ) : null}

            {successMessage ? (
              <Block className="pt-2 text-sm font-medium text-[#22c55e]">
                {successMessage}
              </Block>
            ) : null}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10 dark:bg-[#101014]/95">
              <Button
                large
                tonal
                disabled={isSaving}
                onClick={handleSave}
                className="w-full"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Popup>,
    document.body,
  );
}
