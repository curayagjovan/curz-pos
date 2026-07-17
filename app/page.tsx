"use client";

import Box from "@mui/material/Box";
import { usePageContext } from "@/app/context/page-context";
import ProductsPage from "./pages/products-page";
import TransactionsPage from "./pages/transactions-page";
import InventoryPage from "./pages/inventory-page";
import LoadPage from "./pages/load-page";
import ManageLoadPage from "./pages/manage-load-page";

export default function Page() {
  const { currentPage } = usePageContext();

  const pageComponents: Record<string, React.ReactNode> = {
    products: <ProductsPage />,
    transactions: <TransactionsPage />,
    inventory: <InventoryPage />,
    load: <LoadPage />,
    manageLoad: <ManageLoadPage />,
  };

  return (
    <Box
      key={currentPage}
      sx={{ animation: "page-enter 240ms cubic-bezier(0.32, 0.72, 0, 1)" }}
    >
      {pageComponents[currentPage] || <ProductsPage />}
    </Box>
  );
}
