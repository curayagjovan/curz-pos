"use client";

import { useCallback, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import StorefrontRounded from "@mui/icons-material/StorefrontRounded";
import PointOfSaleRounded from "@mui/icons-material/PointOfSaleRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import { usePageContext } from "@/app/context/page-context";

type MobilePageWrapperProps = {
  title: string;
  children: React.ReactNode;
};

type NavPage = "products" | "transactions" | "inventory";

const APP_BAR_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 68;
const PULL_INDICATOR_OFFSET = 112;

export default function MobilePageWrapper({
  title,
  children,
}: MobilePageWrapperProps) {
  const { currentPage, setCurrentPage, setSearchQuery } = usePageContext();
  const mainRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const resetPullState = useCallback(() => {
    touchStartYRef.current = null;
    setPullDistance(0);
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (refreshing) {
        return;
      }

      const scrollTop = mainRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) {
        touchStartYRef.current = null;
        return;
      }

      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    },
    [refreshing],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (refreshing || touchStartYRef.current === null) {
        return;
      }

      const currentY = event.touches[0]?.clientY;
      if (typeof currentY !== "number") {
        return;
      }

      const delta = currentY - touchStartYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      const dampedDistance = Math.min(96, delta * 0.45);
      setPullDistance(dampedDistance);
      event.preventDefault();
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (refreshing) {
      resetPullState();
      return;
    }

    if (pullDistance >= 64) {
      setRefreshing(true);
      window.dispatchEvent(new CustomEvent("app:pull-to-refresh"));

      window.setTimeout(() => {
        setRefreshing(false);
      }, 700);
    }

    resetPullState();
  }, [pullDistance, refreshing, resetPullState]);

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: NavPage) => {
      if (newValue === currentPage) {
        return;
      }

      setCurrentPage(newValue);
      setSearchQuery("");
    },
    [currentPage, setCurrentPage, setSearchQuery],
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        width: "100%",
      }}
    >
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          pt: "env(safe-area-inset-top)",
          px: "env(safe-area-inset-left)",
          pr: "env(safe-area-inset-right)",
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: APP_BAR_HEIGHT,
            px: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: 0.1,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        sx={{
          height: "100vh",
          boxSizing: "border-box",
          pt: `calc(env(safe-area-inset-top) + ${APP_BAR_HEIGHT}px)`,
          pb: `calc(env(safe-area-inset-bottom) + ${BOTTOM_NAV_HEIGHT + 12}px)`,
          px: 0,
          position: "relative",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: PULL_INDICATOR_OFFSET,
            left: 0,
            right: 0,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
            typography: "caption",
            pointerEvents: "none",
            zIndex: 2,
            opacity: refreshing || pullDistance > 12 ? 1 : 0,
            transform: `translateY(${Math.max(0, pullDistance - 36)}px)`,
            transition: "opacity 120ms ease, transform 150ms ease",
          }}
        >
          {refreshing
            ? "Refreshing..."
            : pullDistance >= 64
              ? "Release to refresh"
              : pullDistance > 12
                ? "Pull down to refresh"
                : ""}
        </Box>
        {children}
      </Box>

      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          pb: "env(safe-area-inset-bottom)",
          px: "env(safe-area-inset-left)",
          pr: "env(safe-area-inset-right)",
          borderTop: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
        }}
      >
        <BottomNavigation
          showLabels
          value={currentPage}
          onChange={(event, newValue) =>
            handleTabChange(event, newValue as NavPage)
          }
          sx={{
            height: BOTTOM_NAV_HEIGHT,
            px: 0.5,
          }}
        >
          <BottomNavigationAction
            value="products"
            label="Products"
            icon={<StorefrontRounded fontSize="small" />}
            sx={{
              minWidth: 0,
              px: 0.5,
              ".MuiBottomNavigationAction-label": {
                fontSize: 11,
                fontWeight: 600,
              },
            }}
          />
          <BottomNavigationAction
            value="transactions"
            label="Sales"
            icon={<PointOfSaleRounded fontSize="small" />}
            sx={{
              minWidth: 0,
              px: 0.5,
              ".MuiBottomNavigationAction-label": {
                fontSize: 11,
                fontWeight: 600,
              },
            }}
          />
          <BottomNavigationAction
            value="inventory"
            label="Inventory"
            icon={<Inventory2Rounded fontSize="small" />}
            sx={{
              minWidth: 0,
              px: 0.5,
              ".MuiBottomNavigationAction-label": {
                fontSize: 11,
                fontWeight: 600,
              },
            }}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
