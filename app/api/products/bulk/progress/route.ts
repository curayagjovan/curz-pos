import {
  getImportProgress,
  subscribeImportProgress,
  type ImportJobProgress,
} from "@/lib/import-progress-store";
import { requireOwner } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

function encodeSseData(
  event: string,
  data: ImportJobProgress | { jobId: string },
) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId")?.trim();

  if (!jobId) {
    return new Response(JSON.stringify({ message: "jobId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const write = (
        event: string,
        data: ImportJobProgress | { jobId: string },
      ) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(encodeSseData(event, data)));
      };

      const closeStream = () => {
        if (closed) {
          return;
        }

        closed = true;
        cleanup();
        controller.close();
      };

      const unsubscribe = subscribeImportProgress(jobId, (progress) => {
        write("progress", progress);

        if (progress.status === "completed" || progress.status === "failed") {
          write("done", progress);
          closeStream();
        }
      });

      const keepAliveId = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      const timeoutId = setTimeout(
        () => {
          write("timeout", { jobId });
          closeStream();
        },
        1000 * 60 * 10,
      );

      const cleanup = () => {
        clearInterval(keepAliveId);
        clearTimeout(timeoutId);
        unsubscribe();
      };

      const initial = getImportProgress(jobId);
      if (initial) {
        write("progress", initial);

        if (initial.status === "completed" || initial.status === "failed") {
          write("done", initial);
          closeStream();
        }
      } else {
        write("progress", {
          jobId,
          status: "pending",
          phase: "pending",
          totalRows: 0,
          processedRows: 0,
          successCount: 0,
          failureCount: 0,
          updatedAt: Date.now(),
        });
      }
    },
    cancel() {
      // The connection ended from the client side.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
