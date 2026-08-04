export type OrderItemInput = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
};

export type OrderPayload = {
  requestId?: string;
  status?: "PENDING" | "PAID" | "REFUNDED" | "VOIDED";
  total?: number;
  amountPaid?: number;
  note?: string;
  customerId?: string;
  senderPushEndpoint?: string;
  items?: OrderItemInput[];
};

export type OrderItemReturnInput = {
  id?: string;
  returnedQuantity?: number;
};

export type OrderStatusUpdatePayload = {
  id?: string;
  status?: "PENDING" | "PAID" | "REFUNDED" | "VOIDED";
  items?: OrderItemReturnInput[];
  amountPaid?: number;
  customerId?: string | null;
};
