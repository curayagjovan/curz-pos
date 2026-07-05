"use client";

import { usePageContext } from "@/app/context/page-context";
import ProductsPage from "./pages/products-page";
import TransactionsPage from "./pages/transactions-page";
import InventoryPage from "./pages/inventory-page";

export default function Page() {
  const { currentPage } = usePageContext();

  const pageComponents: Record<string, React.ReactNode> = {
    products: <ProductsPage />,
    transactions: <TransactionsPage />,
    inventory: <InventoryPage />,
  };

  return pageComponents[currentPage] || <ProductsPage />;
}
