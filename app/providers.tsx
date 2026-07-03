"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { PageProvider } from "@/app/context/page-context";
import { CartProvider } from "@/app/context/cart-context";
import theme from "@/app/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PageProvider>
          <CartProvider>{children}</CartProvider>
        </PageProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
