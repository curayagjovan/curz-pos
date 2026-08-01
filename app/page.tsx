"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "@/app/context/auth-context";
import { usePageContext } from "@/app/context/page-context";
import LoginScreen from "@/app/components/login-screen";
import ProductsPage from "./pages/products-page";
import TransactionsPage from "./pages/transactions-page";
import InventoryPage from "./pages/inventory-page";
import LoadPage from "./pages/load-page";
import ManageLoadPage from "./pages/manage-load-page";
import EWalletPage from "./pages/ewallet-page";
import ManageStaffPage from "./pages/manage-staff-page";
import AuditLogPage from "./pages/audit-log-page";
import CustomersPage from "./pages/customers-page";

export default function Page() {
  const { currentPage } = usePageContext();
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !appUser) {
    return <LoginScreen />;
  }

  const pageComponents: Record<string, React.ReactNode> = {
    products: <ProductsPage />,
    transactions: <TransactionsPage />,
    inventory: <InventoryPage />,
    load: <LoadPage />,
    manageLoad: <ManageLoadPage />,
    ewallet: <EWalletPage />,
    manageStaff: <ManageStaffPage />,
    auditLog: <AuditLogPage />,
    customers: <CustomersPage />,
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
