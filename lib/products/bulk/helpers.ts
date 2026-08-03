import { Prisma } from "@prisma/client";

export function toNameUnitKey(name: string, unit?: string | null): string {
  return `${name.trim().toLowerCase()}::${(unit ?? "").trim().toLowerCase()}`;
}

export function findAvailableSkuFromSet(
  baseSku: string,
  usedSkus: Set<string>,
): string {
  let sequence = 2;

  while (sequence <= 9999) {
    const candidate = `${baseSku}-${String(sequence).padStart(2, "0")}`;
    if (!usedSkus.has(candidate)) {
      return candidate;
    }
    sequence += 1;
  }

  throw new Error("Unable to generate a unique SKU");
}

// Shared by both the per-row planning catch and the DB-op execution catch —
// each row can fail at either stage, and both should surface the same
// plain-language reason for the most common constraint violations.
export function describePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return "Duplicate value violates a unique field";
    if (error.code === "P2003")
      return "Related record not found (foreign key constraint)";
    if (error.code === "P2020") return "Invalid value for a database field";
  }
  if (error instanceof Error && error.message.trim().length > 0)
    return error.message;
  return "Database error";
}
