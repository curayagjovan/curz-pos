import type { Prisma } from "@prisma/client";

export type BulkProductData = {
  sku?: string;
  name?: string;
  unit?: string;
  category?: string;
  description?: string;
  price?: number | string;
  stock?: number | string;
};

export type BulkResult = {
  row: number;
  productName: string;
  sku: string;
  success: boolean;
  message: string;
};

export type BulkMarkupPayload = {
  products: BulkProductData[];
  fileHash?: string;
  jobId?: string;
};

export type ProductSnapshot = {
  id: string;
  sku: string;
  name: string;
  unit: string | null;
  description: string | null;
  cost: Prisma.Decimal;
  markupPct: Prisma.Decimal;
  price: Prisma.Decimal;
  stock: number;
};

export type DbOpFn = () => Promise<unknown>;
