export type TransactionStatus = "PAID" | "REFUNDED" | "VOIDED";

export type TransactionItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
};

export type Transaction = {
  id: string;
  orderNo: string;
  status: TransactionStatus;
  total: number | string;
  amountPaid: number | string | null;
  note: string | null;
  createdAt: string;
  items: TransactionItem[];
};
