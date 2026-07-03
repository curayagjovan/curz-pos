"use client";

import { PageProvider } from "@/app/context/page-context";
import { CartProvider } from "@/app/context/cart-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PageProvider>
      <CartProvider>{children}</CartProvider>
    </PageProvider>
  );
}
