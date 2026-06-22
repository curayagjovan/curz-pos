export type Transaction = {
  id: string;
  orderNo: string;
  status: "PAID" | "CANCELLED" | "PENDING";
  total: number;
  note: string;
  createdAt: string;
};

export type TransactionFilter = "ALL" | "PAID" | "CANCELLED";

export type TransactionCacheEntry = {
  items: Transaction[];
  total: number;
  updatedAt: number;
};

export type ProductListItem = {
  id: string;
  name: string;
  price: number | string;
  sku: string;
  description?: string;
};
