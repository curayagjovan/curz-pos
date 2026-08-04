export type TransactionStatus = "PENDING" | "PAID" | "REFUNDED" | "VOIDED";

export type SaleCategory = "product" | "load_ewallet";

export type TransactionItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  returnedQuantity: number;
  product: { unit: string | null };
};

export type Transaction = {
  id: string;
  orderNo: string;
  status: TransactionStatus;
  total: number | string;
  amountPaid: number | string | null;
  refundAmount: number | string | null;
  refundedAt: string | null;
  note: string | null;
  createdAt: string;
  customerId: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  cashier: { id: string; displayName: string | null; email: string } | null;
  items: TransactionItem[];
};
