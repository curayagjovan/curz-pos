import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";

export function buildLoadMessage(item: LoadCatalogItem, mobileNumber: string) {
  return `${item.code} ${mobileNumber}`;
}
