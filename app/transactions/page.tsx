"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Layout,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useThemeMode } from "../theme-provider";

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

export default function TransactionsPage() {
  const { mode, toggleMode } = useThemeMode();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("ALL");

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load transactions");
        }

        const data = (await response.json()) as ApiOrder[];
        setTransactions(
          data.map((order) => ({
            id: order.id,
            orderNo: order.orderNo,
            status: order.status,
            total: Number(order.total),
            note: order.note ?? "",
            createdAt: order.createdAt,
          })),
        );
      } catch (error) {
        console.error(error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "ALL") {
      return transactions;
    }

    return transactions.filter((item) => item.status === transactionFilter);
  }, [transactionFilter, transactions]);

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
          borderBottom:
            mode === "dark" ? "1px solid #1f2937" : "1px solid #d8e3f2",
          background:
            mode === "dark" ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        <Typography.Title
          level={4}
          style={{ margin: 0, color: mode === "dark" ? "#e5e7eb" : "#12325a" }}
        >
          Curz POS
        </Typography.Title>
        <Space size={8}>
          <Button
            icon={mode === "dark" ? <MoonOutlined /> : <SunOutlined />}
            onClick={toggleMode}
            aria-label="Toggle dark mode"
          />
          <Link href="/">
            <Button>POS</Button>
          </Link>
          <Link href="/transactions">
            <Button type="primary">Transactions</Button>
          </Link>
        </Space>
      </Header>

      <Content
        style={{ padding: 14, maxWidth: 1080, width: "100%", margin: "0 auto" }}
      >
        <Card>
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Transactions
            </Typography.Title>
            <Space wrap>
              <Button
                type={transactionFilter === "ALL" ? "primary" : "default"}
                onClick={() => setTransactionFilter("ALL")}
              >
                All
              </Button>
              <Button
                type={transactionFilter === "PAID" ? "primary" : "default"}
                onClick={() => setTransactionFilter("PAID")}
              >
                Successful
              </Button>
              <Button
                type={transactionFilter === "CANCELLED" ? "primary" : "default"}
                onClick={() => setTransactionFilter("CANCELLED")}
              >
                Not Successful
              </Button>
            </Space>
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : filteredTransactions.length === 0 ? (
              <Empty description="No transactions yet" />
            ) : (
              <Collapse
                items={filteredTransactions.map((item) => ({
                  key: item.id,
                  label: (
                    <Space
                      style={{ width: "100%", justifyContent: "space-between" }}
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
            )}
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
