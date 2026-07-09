"use client";

import { usePageContext } from "@/app/context/page-context";
import ProductsPage from "./pages/products-page";
import TransactionsPage from "./pages/transactions-page";
import InventoryPage from "./pages/inventory-page";
import LoadPage from "./pages/load-page";

export default function Page() {
  const { currentPage } = usePageContext();

  const pageComponents: Record<string, React.ReactNode> = {
    products: <ProductsPage />,
    transactions: <TransactionsPage />,
    inventory: <InventoryPage />,
    load: <LoadPage />,
  };

  return pageComponents[currentPage] || <ProductsPage />;
}
