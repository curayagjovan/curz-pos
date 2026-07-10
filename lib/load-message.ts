import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";

export function buildLoadMessage(item: LoadCatalogItem, mobileNumber: string) {
  return `${item.code} ${mobileNumber}`;
}

export class LoadRequestShareCancelledError extends Error {
  constructor() {
    super("Share was cancelled");
    this.name = "LoadRequestShareCancelledError";
  }
}

export async function shareLoadRequest(
  message: string,
): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text: message });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new LoadRequestShareCancelledError();
      }
      throw error;
    }
  }

  await navigator.clipboard?.writeText(message).catch(() => undefined);
  return "copied";
}
