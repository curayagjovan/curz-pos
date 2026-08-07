"use client";

import { useEffect, useMemo, useState } from "react";
import LockRounded from "@mui/icons-material/LockRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import FadeInContent from "@/app/components/fade-in-content";
import ListEmptyState from "@/app/components/list-empty-state";
import ListSkeleton from "@/app/components/list-skeleton";
import { useAuth } from "@/app/context/auth-context";
import { usePageContext } from "@/app/context/page-context";
import { useProducts } from "@/app/context/products-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { hasPermission } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/currency";
import {
  computeProductMovement,
  type ProductMovementEntry,
} from "@/lib/product-movement";
import type { Transaction } from "@/types/transaction";

const WINDOW_DAYS = 30;

type MovementTab = "popular" | "leastPopular" | "running";

const TAB_CONFIG: Record<
  MovementTab,
  { label: string; emptyDescription: string }
> = {
  popular: {
    label: "Popular",
    emptyDescription: "No sales recorded in this window yet.",
  },
  leastPopular: {
    label: "Least Popular",
    emptyDescription: "No products found.",
  },
  running: {
    label: "Running",
    emptyDescription: "No products have sold consistently enough yet.",
  },
};

function MovementRow({
  rank,
  entry,
  tab,
}: {
  rank: number;
  entry: ProductMovementEntry;
  tab: MovementTab;
}) {
  const secondary =
    tab === "running"
      ? `Sold on ${entry.activeDays}/${WINDOW_DAYS} days · ${entry.orderCount} orders`
      : entry.quantitySold > 0
        ? `${entry.quantitySold} sold · ${formatCurrency(entry.revenue)}`
        : "Never sold in this window";

  return (
    <ListItem divider>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 28, flex: "0 0 auto", fontWeight: 700 }}
      >
        {rank}
      </Typography>
      <ListItemText primary={entry.name} secondary={secondary} />
    </ListItem>
  );
}

export default function ProductMovementPage() {
  const { setCurrentPage } = usePageContext();
  const { appUser, loading: authLoading } = useAuth();
  const { products } = useProducts();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MovementTab>("popular");
  const [analysisTimeMs] = useState(() => Date.now());

  const accessResolved = !authLoading;
  const canView = hasPermission(appUser, "VIEW_PRODUCT_MOVEMENT");

  useEffect(() => {
    if (!accessResolved || !canView) {
      return;
    }

    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const to = new Date(analysisTimeMs);
        const from = new Date(
          analysisTimeMs - WINDOW_DAYS * 24 * 60 * 60 * 1000,
        );
        const params = new URLSearchParams({
          status: "PAID",
          from: from.toISOString(),
          to: to.toISOString(),
        });

        const response = await fetch(`/api/orders?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load sales history");
        }
        if (!active) {
          return;
        }

        setTransactions(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load sales history",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [analysisTimeMs, accessResolved, canView]);

  const movement = useMemo(
    () =>
      computeProductMovement(
        products,
        transactions,
        analysisTimeMs,
        WINDOW_DAYS,
      ),
    [products, transactions, analysisTimeMs],
  );

  const entries = movement[tab];

  return (
    <MobilePageWrapper
      title="Product Movement"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 1, pb: 4 }}>
        {!accessResolved ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : !canView ? (
          <ListEmptyState
            description="Ask an owner to grant you access to Product Movement."
            icon={<LockRounded fontSize="small" />}
          />
        ) : (
          <Stack spacing={1.5}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 0.5 }}
            >
              Last {WINDOW_DAYS} days of paid orders
            </Typography>

            <Tabs
              value={tab}
              onChange={(_event, value: MovementTab) => setTab(value)}
              variant="fullWidth"
            >
              {Object.entries(TAB_CONFIG).map(([key, config]) => (
                <Tab key={key} value={key} label={config.label} />
              ))}
            </Tabs>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <ListSkeleton showAvatar={false} />
            ) : entries.length === 0 ? (
              <ListEmptyState
                description={TAB_CONFIG[tab].emptyDescription}
                icon={<TrendingUpRounded fontSize="small" />}
              />
            ) : (
              <FadeInContent>
                <List disablePadding>
                  {entries.map((entry, index) => (
                    <MovementRow
                      key={entry.productId}
                      rank={index + 1}
                      entry={entry}
                      tab={tab}
                    />
                  ))}
                </List>
              </FadeInContent>
            )}
          </Stack>
        )}
      </Container>
    </MobilePageWrapper>
  );
}
