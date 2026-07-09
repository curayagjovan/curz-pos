import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";

export function buildLoadMessage(item: LoadCatalogItem, mobileNumber: string) {
  return `LOAD ${item.code} ${mobileNumber}`;
}

export function buildMessengerUrl(message: string) {
  const pageUsername = process.env.NEXT_PUBLIC_MESSENGER_PAGE;
  const encodedMessage = encodeURIComponent(message);

  if (!pageUsername) {
    return null;
  }

  return `https://m.me/${pageUsername}?text=${encodedMessage}`;
}
