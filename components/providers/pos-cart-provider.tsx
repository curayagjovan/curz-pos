"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { computeTax } from "@/lib/tax-config";
import { type CartItem } from "@/components/pos/cart-content";
import { type Product } from "@/components/pos/product-row";

type PosCartContextValue = {
  cart: CartItem[];
  paymentAmount: number | null;
  quickCashAmounts: number[];
  subtotal: number;
  tax: number;
  total: number;
  change: number;
  cartItemCount: number;
  hasEnoughPayment: boolean;
  setPaymentAmount: (value: number | null) => void;
  addToCart: (product: Product, quantity: number) => void;
  updateQty: (productId: string, delta: number) => void;
  clearCart: () => void;
};

const PosCartContext = createContext<PosCartContextValue | null>(null);

const CART_STORAGE_KEY = "curz-pos-cart";
const PAYMENT_STORAGE_KEY = "curz-pos-payment-amount";

function getLineTotal(item: {
  quantity: number;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
}) {
  if (
    item.bundleQty &&
    item.bundleQty >= 2 &&
    item.bundlePrice !== null &&
    item.bundlePrice >= 0
  ) {
    const bundles = Math.floor(item.quantity / item.bundleQty);
    const remainder = item.quantity % item.bundleQty;
    return Number(
      (bundles * item.bundlePrice + remainder * item.price).toFixed(2),
    );
  }

  return Number((item.quantity * item.price).toFixed(2));
}

type PosCartProviderProps = {
  children: React.ReactNode;
};

export function PosCartProvider({ children }: PosCartProviderProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  useEffect(() => {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[];
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      } catch {
        // Ignore invalid persisted data.
      }
    }

    const savedPayment = window.localStorage.getItem(PAYMENT_STORAGE_KEY);
    if (savedPayment) {
      const parsedPayment = Number(savedPayment);
      if (Number.isFinite(parsedPayment) && parsedPayment >= 0) {
        setPaymentAmount(parsedPayment);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (paymentAmount === null) {
      window.localStorage.removeItem(PAYMENT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(PAYMENT_STORAGE_KEY, String(paymentAmount));
  }, [paymentAmount]);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((items) => {
      return items
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          if (delta > 0 && item.quantity >= item.stock) {
            return item;
          }

          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0);
    });
  }, []);

  const addToCart = useCallback((product: Product, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity));

    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (!existing) {
        return [
          ...items,
          {
            ...product,
            quantity: Math.min(safeQuantity, product.stock),
          },
        ];
      }

      return items.map((item) => {
        if (item.id !== product.id) {
          return item;
        }

        const nextQuantity = Math.min(item.quantity + safeQuantity, item.stock);
        return { ...item, quantity: nextQuantity };
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setPaymentAmount(null);
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getLineTotal(item), 0),
    [cart],
  );
  const tax = useMemo(() => computeTax(subtotal), [subtotal]);
  const total = useMemo(
    () => Number((subtotal + tax).toFixed(2)),
    [subtotal, tax],
  );
  const change = useMemo(
    () => Number(((paymentAmount ?? 0) - total).toFixed(2)),
    [paymentAmount, total],
  );
  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const hasEnoughPayment = cart.length > 0 && (paymentAmount ?? 0) >= total;
  const quickCashAmounts = [100, 200, 500, 1000];

  const value = useMemo(
    () => ({
      cart,
      paymentAmount,
      quickCashAmounts,
      subtotal,
      tax,
      total,
      change,
      cartItemCount,
      hasEnoughPayment,
      setPaymentAmount,
      addToCart,
      updateQty,
      clearCart,
    }),
    [
      addToCart,
      cart,
      cartItemCount,
      change,
      clearCart,
      hasEnoughPayment,
      paymentAmount,
      subtotal,
      tax,
      total,
      updateQty,
    ],
  );

  return (
    <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>
  );
}

export function usePosCart() {
  const context = useContext(PosCartContext);
  if (!context) {
    throw new Error("usePosCart must be used within PosCartProvider");
  }

  return context;
}
