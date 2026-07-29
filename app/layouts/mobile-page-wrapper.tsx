"use client";

import { useCallback, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ArrowBackIosNewRounded from "@mui/icons-material/ArrowBackIosNewRounded";
import GroupRounded from "@mui/icons-material/GroupRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import StorefrontRounded from "@mui/icons-material/StorefrontRounded";
import PointOfSaleRounded from "@mui/icons-material/PointOfSaleRounded";
import SimCardRounded from "@mui/icons-material/SimCardRounded";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import { useAuth } from "@/app/context/auth-context";
import { usePageContext } from "@/app/context/page-context";

type MobilePageWrapperProps = {
  title: string;
  /** Page-specific menu items rendered inside the shared account menu. Call
   * the provided closeMenu() before triggering any page-local action. */
  pageMenuItems?: (closeMenu: () => void) => React.ReactNode;
  onBack?: () => void;
  hideBottomNav?: boolean;
  children: React.ReactNode;
};

type NavPage = "products" | "transactions" | "inventory" | "load" | "ewallet";

const APP_BAR_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 68;
const PULL_INDICATOR_OFFSET = 112;
const TITLE_COLLAPSE_THRESHOLD = 36;

const easeIOS = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function MobilePageWrapper({
  title,
  pageMenuItems,
  onBack,
  hideBottomNav = false,
  children,
}: MobilePageWrapperProps) {
  const { currentPage, setCurrentPage, setSearchQuery } = usePageContext();
  const { user, appUser, signOut } = useAuth();
  const mainRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] =
    useState<HTMLElement | null>(null);
  const closeAccountMenu = useCallback(() => setAccountMenuAnchor(null), []);
  const avatarUrl: string | undefined =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;

  const handleScroll = useCallback(() => {
    const scrollTop = mainRef.current?.scrollTop ?? 0;
    setScrolled(scrollTop > TITLE_COLLAPSE_THRESHOLD);
  }, []);

  const resetPullState = useCallback(() => {
    touchStartYRef.current = null;
    setPullDistance(0);
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (refreshing) {
        return;
      }

      // MUI Drawer/Modal content is portaled to document.body, but React
      // still bubbles its touch events along the component tree, so a swipe
      // inside a bottom sheet would otherwise reach this handler too.
      if ((event.target as Element | null)?.closest(".MuiModal-root")) {
        touchStartYRef.current = null;
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
          transition: `border-color 220ms ${easeIOS}`,
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
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {onBack ? (
              <IconButton
                onClick={onBack}
                aria-label="go back"
                edge="start"
                sx={{ ml: -1, color: "primary.main" }}
              >
                <ArrowBackIosNewRounded fontSize="small" />
              </IconButton>
            ) : null}
          </Stack>

          <Typography
            variant="h6"
            component="div"
            sx={{
              position: "absolute",
              left: 56,
              right: 56,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "none",
              opacity: scrolled ? 1 : 0,
              transform: scrolled ? "translateY(0)" : "translateY(6px)",
              transition: `opacity 220ms ${easeIOS}, transform 220ms ${easeIOS}`,
            }}
          >
            {title}
          </Typography>

          <IconButton
            onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
            aria-label="account menu"
            sx={{ p: 0.25 }}
          >
            <Avatar src={avatarUrl} sx={{ width: 30, height: 30 }}>
              {!avatarUrl
                ? (user?.email?.[0]?.toUpperCase() ?? "?")
                : null}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={accountMenuAnchor}
            open={Boolean(accountMenuAnchor)}
            onClose={closeAccountMenu}
          >
            <MenuItem disabled divider>
              <ListItemText
                primary={user?.email ?? "Signed in"}
                secondary={
                  appUser?.role === "OWNER" ? "Owner" : "Cashier"
                }
              />
            </MenuItem>
            {pageMenuItems ? pageMenuItems(closeAccountMenu) : null}
            {pageMenuItems ? <Divider key="page-menu-divider" /> : null}
            {appUser?.role === "OWNER" ? (
              <MenuItem
                onClick={() => {
                  closeAccountMenu();
                  setCurrentPage("manageStaff");
                }}
              >
                <ListItemIcon>
                  <GroupRounded fontSize="small" />
                </ListItemIcon>
                <ListItemText>Manage Staff</ListItemText>
              </MenuItem>
            ) : null}
            {appUser?.role === "OWNER" ? (
              <MenuItem
                onClick={() => {
                  closeAccountMenu();
                  setCurrentPage("auditLog");
                }}
              >
                <ListItemIcon>
                  <HistoryRounded fontSize="small" />
                </ListItemIcon>
                <ListItemText>Audit Trail</ListItemText>
              </MenuItem>
            ) : null}
            <Divider />
            <MenuItem
              onClick={() => {
                closeAccountMenu();
                void signOut();
              }}
            >
              <ListItemIcon>
                <LogoutRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign Out</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        ref={mainRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        sx={{
          height: "100vh",
          boxSizing: "border-box",
          pt: `calc(env(safe-area-inset-top) + ${APP_BAR_HEIGHT}px)`,
          pb: hideBottomNav
            ? "calc(env(safe-area-inset-bottom) + 16px)"
            : `calc(env(safe-area-inset-bottom) + ${BOTTOM_NAV_HEIGHT + 12}px)`,
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

        <Container maxWidth="sm" sx={{ pt: 1, pb: 0 }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
        </Container>

        {children}
      </Box>

      {hideBottomNav ? null : (
        <Paper
          elevation={0}
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
            bgcolor:
              "rgba(var(--mui-palette-background-defaultChannel) / 0.82)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
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
              sx={{ px: 0.5 }}
            />
            <BottomNavigationAction
              value="transactions"
              label="Sales"
              icon={<PointOfSaleRounded fontSize="small" />}
              sx={{ px: 0.5 }}
            />
            <BottomNavigationAction
              value="load"
              label="Load"
              icon={<SimCardRounded fontSize="small" />}
              sx={{ px: 0.5 }}
            />
            <BottomNavigationAction
              value="ewallet"
              label="E-Wallet"
              icon={<AccountBalanceWalletRounded fontSize="small" />}
              sx={{ px: 0.5 }}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
