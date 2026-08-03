import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { setImportProgress } from "@/lib/import-progress-store";
import { requirePermission } from "@/lib/auth/require-user";
import type { BulkMarkupPayload, BulkResult } from "@/lib/products/bulk/types";
import { describePrismaError } from "@/lib/products/bulk/helpers";
import { preloadExistingProducts } from "@/lib/products/bulk/preload";
import { planBulkImportRow } from "@/lib/products/bulk/plan-row";

// Use direct DB connection for bulk imports to reduce pooled-connection issues.
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    },
  },
  log: ["error"],
});

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_PRODUCTS");
  if (!auth.ok) {
    return auth.response;
  }

  let importJobId: string | undefined;

  try {
    const requestStartedAt = Date.now();

    let body: BulkMarkupPayload;
    try {
      body = (await request.json()) as BulkMarkupPayload;
    } catch (parseError) {
      const parseMessage =
        parseError instanceof SyntaxError
          ? `Invalid JSON: ${parseError.message}`
          : "Failed to parse request body";
      console.error(`[Bulk Import] Parse error: ${parseMessage}`);
      return NextResponse.json({ message: parseMessage }, { status: 400 });
    }

    const { products, fileHash, jobId } = body;
    importJobId = jobId;

    // Detect re-import: allow processing but skip stock additions
    let isDuplicateFile = false;
    if (fileHash) {
      const recentImport = await prisma.importLog.findUnique({
        where: { fileHash },
      });

      if (recentImport) {
        isDuplicateFile = true;
        console.info(
          `[Bulk Import] Duplicate file detected (hash ${fileHash}). Stock additions will be skipped.`,
        );
      }
    }

    if (!Array.isArray(products) || products.length === 0) {
      if (jobId) {
        setImportProgress(jobId, {
          status: "failed",
          phase: "failed",
          message: "No products provided",
        });
      }

      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 },
      );
    }

    const setupFinishedAt = Date.now();
    const preloadStartedAt = Date.now();

    const results: BulkResult[] = [];
    const totalRows = products.length;
    let processedRows = 0;
    let successSoFar = 0;
    let failureSoFar = 0;

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "setup",
        totalRows,
        processedRows: 0,
        successCount: 0,
        failureCount: 0,
        message: "Preparing import",
      });
    }

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "preload",
        totalRows,
        processedRows: 0,
        successCount: 0,
        failureCount: 0,
        message: "Preloading existing products",
      });
    }

    const preload = await preloadExistingProducts(prisma, products);

    const preloadFinishedAt = Date.now();
    const processingStartedAt = Date.now();

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "processing",
        totalRows,
        processedRows: 0,
        successCount: 0,
        failureCount: 0,
        message: "Planning import operations",
      });
    }

    console.info(`[Bulk Import] Planning ${totalRows} row(s).`);

    // --- Planning phase: resolve all SKUs and build DB ops in-memory (no DB calls) ---
    type DbOpFn = () => Promise<unknown>;
    const plannedDbOps: Array<{ resultIndex: number; fn: DbOpFn }> = [];

    for (const [index, item] of products.entries()) {
      const { result, dbOp } = planBulkImportRow({
        prisma,
        item,
        row: index + 1,
        isDuplicateFile,
        preload,
      });

      const resultIndex = results.length;
      results.push(result);

      if (dbOp) {
        plannedDbOps.push({ resultIndex, fn: dbOp });
      }
    }

    console.info(
      `[Bulk Import] Planning done. Executing ${plannedDbOps.length} DB ops in parallel.`,
    );

    // --- Execution phase: run DB ops in-order so later updates can safely target products
    // created earlier in the same import request.
    const CHUNK_SIZE = 1;
    for (let i = 0; i < plannedDbOps.length; i += CHUNK_SIZE) {
      const chunk = plannedDbOps.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async ({ resultIndex, fn }) => {
          try {
            await fn();
          } catch (error) {
            results[resultIndex].success = false;
            results[resultIndex].message = describePrismaError(error);
          }
        }),
      );

      processedRows += chunk.length;
      successSoFar = results
        .slice(0, processedRows)
        .filter((r) => r.success).length;
      failureSoFar = processedRows - successSoFar;

      if (jobId) {
        setImportProgress(jobId, {
          status: "running",
          phase: "processing",
          totalRows,
          processedRows,
          successCount: successSoFar,
          failureCount: failureSoFar,
          message: `Processed ${processedRows}/${totalRows}`,
        });
      }

      console.info(
        `[Bulk Import] Processed ${processedRows}/${totalRows} | Success: ${successSoFar} | Failed: ${failureSoFar}`,
      );
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const processingFinishedAt = Date.now();

    console.info(
      `[Bulk Import] Finished ${totalRows} row(s) | Success: ${successCount} | Failed: ${failureCount}`,
    );

    const loggingStartedAt = Date.now();

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "logging",
        totalRows,
        processedRows: totalRows,
        successCount,
        failureCount,
        message: "Finalizing import logs",
      });
    }

    // Log this import for duplicate detection
    if (fileHash) {
      await prisma.importLog.upsert({
        where: { fileHash },
        update: {
          rowCount: totalRows,
          productCount: products.length,
          successCount,
          failureCount,
        },
        create: {
          fileHash,
          rowCount: totalRows,
          productCount: products.length,
          successCount,
          failureCount,
        },
      });
    }

    const loggingFinishedAt = Date.now();
    const timing = {
      setupMs: setupFinishedAt - requestStartedAt,
      preloadMs: preloadFinishedAt - preloadStartedAt,
      processingMs: processingFinishedAt - processingStartedAt,
      loggingMs: loggingFinishedAt - loggingStartedAt,
      totalMs: loggingFinishedAt - requestStartedAt,
    };

    console.info(
      `[Bulk Import Timing] total=${timing.totalMs}ms setup=${timing.setupMs}ms preload=${timing.preloadMs}ms processing=${timing.processingMs}ms logging=${timing.loggingMs}ms`,
    );

    if (jobId) {
      setImportProgress(jobId, {
        status: "completed",
        phase: "completed",
        totalRows,
        processedRows: totalRows,
        successCount,
        failureCount,
        message: "Import complete",
        durationMs: timing.totalMs,
        timing,
      });
    }

    const response = NextResponse.json(
      {
        message: `Imported ${successCount} product(s), ${failureCount} failed`,
        summary: { successCount, failureCount, total: results.length },
        results,
        durationMs: timing.totalMs,
        timing,
        isDuplicate: fileHash && results.length === 0 ? false : undefined,
      },
      { status: 200 },
    );

    response.headers.set(
      "Server-Timing",
      `setup;dur=${timing.setupMs}, preload;dur=${timing.preloadMs}, processing;dur=${timing.processingMs}, logging;dur=${timing.loggingMs}, total;dur=${timing.totalMs}`,
    );

    return response;
  } catch (error) {
    const errorName =
      error instanceof Error ? error.constructor.name : typeof error;
    const errorMessage =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unknown error";

    console.error(`[Bulk Import] Error (${errorName}):`, errorMessage);
    if (error instanceof Error) {
      console.error("[Bulk Import] Stack:", error.stack);
    }

    try {
      const userFacingMessage = (() => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            return "Duplicate SKU or product already exists. Please check your data.";
          }
          if (error.code === "P2003") {
            return "Product reference error. Some related products may not exist.";
          }
          if (error.code === "P2020") {
            return "Invalid data format for a database field. Check price and stock values are numbers.";
          }
          return `Database error (${error.code}): ${error.message}`;
        }

        if (error instanceof SyntaxError) {
          return "Invalid request format. Please ensure the CSV is properly formatted.";
        }

        return errorMessage || "Unable to process bulk import";
      })();

      if (importJobId) {
        setImportProgress(importJobId, {
          status: "failed",
          phase: "failed",
          message: userFacingMessage,
        });
      }
    } catch {
      // Ignore progress update errors when handling top-level failures.
    }

    return NextResponse.json(
      { message: "Unable to process bulk import" },
      { status: 500 },
    );
  }
}
