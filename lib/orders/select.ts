export const orderItemSelect = {
  id: true,
  productName: true,
  quantity: true,
  unitPrice: true,
  lineTotal: true,
  returnedQuantity: true,
} as const;

export const orderListSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  refundAmount: true,
  refundedAt: true,
  note: true,
  createdAt: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, phone: true },
  },
  cashier: {
    select: { id: true, displayName: true, email: true },
  },
  items: {
    select: orderItemSelect,
  },
} as const;

export const orderListSelectWithAmountPaid = {
  ...orderListSelectBase,
  amountPaid: true,
} as const;

export const orderCreateSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  amountPaid: true,
  refundAmount: true,
  refundedAt: true,
  note: true,
  createdAt: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, phone: true },
  },
  cashier: {
    select: { id: true, displayName: true, email: true },
  },
  items: {
    select: orderItemSelect,
  },
} as const;

export const orderCreateSelectWithAmountPaid = {
  ...orderCreateSelectBase,
} as const;

export const duplicateGuardOrderSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  note: true,
  createdAt: true,
  items: {
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
} as const;

export const duplicateGuardOrderSelectWithAmountPaid = {
  ...duplicateGuardOrderSelectBase,
  amountPaid: true,
} as const;
