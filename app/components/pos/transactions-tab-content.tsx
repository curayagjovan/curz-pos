"use client";

import {
  Card,
  Space,
  Typography,
  Button,
  Skeleton,
  Empty,
  Collapse,
  Pagination,
  Tag,
} from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import type { Transaction, TransactionFilter } from "@/app/types";

const TRANSACTION_PAGE_SIZE = 10;

interface TransactionsTabContentProps {
  mode: "light" | "dark";
  loadingTransactions: boolean;
  transactions: Transaction[];
  transactionFilter: TransactionFilter;
  currentTransactionPage: number;
  totalTransactions: number;
  search: string;
  onFilterChange: (filter: TransactionFilter) => void;
  onPageChange: (page: number) => void;
}

const getStatusTag = (status: Transaction["status"]) => {
  if (status === "PAID") {
    return <Tag color="green">Successful</Tag>;
  }

  if (status === "CANCELLED") {
    return <Tag color="red">Not Successful</Tag>;
  }

  return <Tag>Pending</Tag>;
};

export function TransactionsTabContent({
  mode,
  loadingTransactions,
  transactions,
  transactionFilter,
  currentTransactionPage,
  totalTransactions,
  search,
  onFilterChange,
  onPageChange,
}: TransactionsTabContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateUrlParams = (newFilter?: TransactionFilter, newPage?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "transactions");
    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }
    params.set("txFilter", newFilter ?? transactionFilter);
    params.set("txPage", String(newPage ?? currentTransactionPage));
    router.replace(`/pages?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleFilterChange = (filter: TransactionFilter) => {
    onFilterChange(filter);
    onPageChange(1);
    updateUrlParams(filter, 1);
  };

  const handlePageChange = (page: number) => {
    onPageChange(page);
    updateUrlParams(undefined, page);
  };

  return (
    <Card
      style={{
        background:
          mode === "dark"
            ? "linear-gradient(135deg, rgba(20,31,55,0.9), rgba(15,23,42,0.8))"
            : undefined,
        border:
          mode === "dark" ? "1px solid rgba(71, 85, 105, 0.5)" : undefined,
      }}
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Title
          level={4}
          style={{
            margin: 0,
            color: mode === "dark" ? "#f1f5f9" : undefined,
          }}
        >
          Transactions
        </Typography.Title>
        <Space wrap>
          <Button
            size="large"
            type={transactionFilter === "ALL" ? "primary" : "default"}
            onClick={() => handleFilterChange("ALL")}
          >
            All
          </Button>
          <Button
            size="large"
            type={transactionFilter === "PAID" ? "primary" : "default"}
            onClick={() => handleFilterChange("PAID")}
          >
            Successful
          </Button>
          <Button
            size="large"
            type={transactionFilter === "CANCELLED" ? "primary" : "default"}
            onClick={() => handleFilterChange("CANCELLED")}
          >
            Not Successful
          </Button>
        </Space>

        {loadingTransactions ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : transactions.length === 0 ? (
          <Empty description="No transactions yet" />
        ) : (
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Collapse
              style={{
                background: mode === "dark" ? "rgba(15,23,42,0.6)" : undefined,
                border:
                  mode === "dark"
                    ? "1px solid rgba(71, 85, 105, 0.4)"
                    : undefined,
              }}
              items={transactions.map((item) => ({
                key: item.id,
                label: (
                  <Space
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      color: mode === "dark" ? "#e2e8f0" : undefined,
                    }}
                    wrap
                  >
                    <Typography.Text
                      strong
                      style={{
                        color: mode === "dark" ? "#f1f5f9" : undefined,
                      }}
                    >
                      {item.orderNo}
                    </Typography.Text>
                    <Space>
                      {getStatusTag(item.status)}
                      <Typography.Text
                        strong
                        style={{
                          color: mode === "dark" ? "#cbd5e1" : undefined,
                        }}
                      >
                        ₱{item.total.toFixed(2)}
                      </Typography.Text>
                    </Space>
                  </Space>
                ),
                children: (
                  <Space
                    orientation="vertical"
                    size={6}
                    style={{
                      width: "100%",
                      background:
                        mode === "dark" ? "rgba(10,17,31,0.5)" : undefined,
                      padding: "8px 0",
                    }}
                  >
                    <Typography.Text
                      type="secondary"
                      style={{
                        color: mode === "dark" ? "#a0aec0" : undefined,
                      }}
                    >
                      Date: {new Date(item.createdAt).toLocaleString()}
                    </Typography.Text>
                    <Typography.Text
                      style={{
                        color: mode === "dark" ? "#cbd5e1" : undefined,
                      }}
                    >
                      Note: {item.note || "No note"}
                    </Typography.Text>
                  </Space>
                ),
              }))}
            />
            <Pagination
              current={currentTransactionPage}
              pageSize={TRANSACTION_PAGE_SIZE}
              total={totalTransactions}
              onChange={handlePageChange}
              showSizeChanger={false}
              simple
            />
          </Space>
        )}
      </Space>
    </Card>
  );
}
