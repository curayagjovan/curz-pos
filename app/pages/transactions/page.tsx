"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Collapse,
  Empty,
  FloatButton,
  Grid,
  Layout,
  Pagination,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useThemeMode } from "@/components/providers/theme-provider";
import { useCompactHeight } from "@/hooks/use-compact-height";

const { Header, Content } = Layout;

type ApiOrder = {
  id: string;
  orderNo: string;
  status: "PAID" | "CANCELLED" | "PENDING";
  total: number | string;
  note?: string | null;
  createdAt: string;
};

type Transaction = {
  id: string;
  orderNo: string;
  status: "PAID" | "CANCELLED" | "PENDING";
  total: number;
  note: string;
  createdAt: string;
};

type TransactionFilter = "ALL" | "PAID" | "CANCELLED";
const PAGE_SIZE = 10;

type TransactionCacheEntry = {
  items: Transaction[];
  total: number;
  updatedAt: number;
};

const TRANSACTION_CACHE_TTL_MS = 30_000;
const transactionCache = new Map<string, TransactionCacheEntry>();

export default function TransactionsPage() {
  const router = useRouter();
  const { mode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("ALL");

  useEffect(() => {
    router.prefetch("/pages/");
  }, [router]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const cacheKey = `${transactionFilter}:${currentPage}`;
        const cached = transactionCache.get(cacheKey);
        if (
          cached &&
          Date.now() - cached.updatedAt < TRANSACTION_CACHE_TTL_MS
        ) {
          setTransactions(cached.items);
          setTotalTransactions(cached.total);
          setLoading(false);
          return;
        }

        setLoading(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });

        if (transactionFilter !== "ALL") {
          params.set("status", transactionFilter);
        }

        const response = await fetch(`/api/orders?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load transactions");
        }

        const data = (await response.json()) as {
          items: ApiOrder[];
          total: number;
        };

        const normalizedItems = data.items.map((order) => ({
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          total: Number(order.total),
          note: order.note ?? "",
          createdAt: order.createdAt,
        }));

        const total = Number(data.total ?? 0);
        setTotalTransactions(total);
        setTransactions(normalizedItems);
        transactionCache.set(cacheKey, {
          items: normalizedItems,
          total,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadTransactions();
  }, [currentPage, transactionFilter]);

  const getStatusTag = (status: Transaction["status"]) => {
    if (status === "PAID") {
      return <Tag color="green">Successful</Tag>;
    }

    if (status === "CANCELLED") {
      return <Tag color="red">Not Successful</Tag>;
    }

    return <Tag>Pending</Tag>;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          borderBottom:
            mode === "dark" ? "1px solid #1f2937" : "1px solid #d8e3f2",
          background:
            mode === "dark" ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 2,
          paddingInline: isDesktop ? 16 : 12,
          paddingTop: "max(env(safe-area-inset-top), 8px)",
          minHeight: `calc(${isCompactHeight ? 48 : 56}px + env(safe-area-inset-top))`,
        }}
      >
        <Typography.Title
          level={isDesktop ? 4 : 5}
          style={{ margin: 0, color: mode === "dark" ? "#e5e7eb" : "#12325a" }}
        >
          Curz POS
        </Typography.Title>
        <Space size={8} wrap>
          <Link href="/pages/settings">
            <Button
              icon={<SettingOutlined />}
              size={isDesktop ? "middle" : "large"}
              aria-label="Settings"
            />
          </Link>
          <Link href="/pages/">
            <Button size={isDesktop ? "middle" : "large"}>POS</Button>
          </Link>
          <Link href="/pages/transactions">
            <Button type="primary" size={isDesktop ? "middle" : "large"}>
              Transactions
            </Button>
          </Link>
        </Space>
      </Header>

      <Content
        style={{
          paddingTop: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingInline: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          maxWidth: 1080,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Card>
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Transactions
            </Typography.Title>
            <Space wrap>
              <Button
                size={isDesktop ? "middle" : "large"}
                type={transactionFilter === "ALL" ? "primary" : "default"}
                onClick={() => {
                  setCurrentPage(1);
                  setTransactionFilter("ALL");
                }}
              >
                All
              </Button>
              <Button
                size={isDesktop ? "middle" : "large"}
                type={transactionFilter === "PAID" ? "primary" : "default"}
                onClick={() => {
                  setCurrentPage(1);
                  setTransactionFilter("PAID");
                }}
              >
                Successful
              </Button>
              <Button
                size={isDesktop ? "middle" : "large"}
                type={transactionFilter === "CANCELLED" ? "primary" : "default"}
                onClick={() => {
                  setCurrentPage(1);
                  setTransactionFilter("CANCELLED");
                }}
              >
                Not Successful
              </Button>
            </Space>
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : transactions.length === 0 ? (
              <Empty description="No transactions yet" />
            ) : (
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                <Collapse
                  items={transactions.map((item) => ({
                    key: item.id,
                    label: (
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                        wrap
                      >
                        <Typography.Text strong>{item.orderNo}</Typography.Text>
                        <Space>
                          {getStatusTag(item.status)}
                          <Typography.Text strong>
                            ₱{item.total.toFixed(2)}
                          </Typography.Text>
                        </Space>
                      </Space>
                    ),
                    children: (
                      <Space
                        orientation="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <Typography.Text type="secondary">
                          Date: {new Date(item.createdAt).toLocaleString()}
                        </Typography.Text>
                        <Typography.Text>
                          Note: {item.note || "No note"}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={totalTransactions}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  simple
                />
              </Space>
            )}
          </Space>
        </Card>
      </Content>

      <FloatButton.BackTop
        visibilityHeight={300}
        style={{
          right: 16,
          bottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
      />
    </Layout>
  );
}
