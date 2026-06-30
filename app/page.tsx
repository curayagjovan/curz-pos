"use client";

import { usePageContext } from "@/app/context/page-context";
import ProductsPage from "./pages/products-page";
import TransactionsPage from "./pages/transactions-page";
import InventoryPage from "./pages/inventory-page";
import SettingsPage from "./pages/settings-page";

export default function Page() {
  const { currentPage } = usePageContext();

  const pageComponents: Record<string, React.ReactNode> = {
    products: <ProductsPage />,
    transactions: <TransactionsPage />,
    inventory: <InventoryPage />,
    settings: <SettingsPage />,
  };

  return pageComponents[currentPage] || <ProductsPage />;
}
