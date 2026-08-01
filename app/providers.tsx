"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import AppUpdateBanner from "@/app/components/app-update-banner";
import NotificationPermissionManager from "@/app/components/notification-permission-manager";
import { AuthProvider } from "@/app/context/auth-context";
import { PageProvider } from "@/app/context/page-context";
import { CartProvider } from "@/app/context/cart-context";
import { CustomersProvider } from "@/app/context/customers-context";
import { LoadItemsProvider } from "@/app/context/load-items-context";
import { ProductsProvider } from "@/app/context/products-context";
import { TransactionsProvider } from "@/app/context/transactions-context";
import appTheme from "@/app/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider
        theme={appTheme}
        defaultMode="system"
        disableTransitionOnChange
      >
        <CssBaseline enableColorScheme />
        <AppUpdateBanner />
        <AuthProvider>
          <PageProvider>
            <ProductsProvider>
              <TransactionsProvider>
                <CustomersProvider>
                  <LoadItemsProvider>
                    <CartProvider>{children}</CartProvider>
                  </LoadItemsProvider>
                </CustomersProvider>
              </TransactionsProvider>
            </ProductsProvider>
          </PageProvider>
          <NotificationPermissionManager />
        </AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
