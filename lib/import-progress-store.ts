export type ImportJobStatus = "pending" | "running" | "completed" | "failed";

export type ImportJobPhase =
  | "pending"
  | "setup"
  | "preload"
  | "processing"
  | "logging"
  | "completed"
  | "failed";

export type ImportTiming = {
  setupMs: number;
  preloadMs: number;
  processingMs: number;
  loggingMs: number;
  totalMs: number;
};

export type ImportJobProgress = {
  jobId: string;
  status: ImportJobStatus;
  phase: ImportJobPhase;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  message?: string;
  durationMs?: number;
  timing?: ImportTiming;
  updatedAt: number;
};

type Listener = (progress: ImportJobProgress) => void;

type ProgressStore = {
  jobs: Map<string, ImportJobProgress>;
  listeners: Map<string, Set<Listener>>;
};

const globalForImportProgress = globalThis as unknown as {
  importProgressStore?: ProgressStore;
};

const store: ProgressStore = globalForImportProgress.importProgressStore ?? {
  jobs: new Map<string, ImportJobProgress>(),
  listeners: new Map<string, Set<Listener>>(),
};

if (!globalForImportProgress.importProgressStore) {
  globalForImportProgress.importProgressStore = store;
}

const STALE_JOB_MS = 1000 * 60 * 30;

function pruneStaleJobs() {
  const now = Date.now();

  for (const [jobId, progress] of store.jobs.entries()) {
    if (now - progress.updatedAt > STALE_JOB_MS) {
      store.jobs.delete(jobId);
      store.listeners.delete(jobId);
    }
  }
}

export function setImportProgress(
  jobId: string,
  partial: Omit<Partial<ImportJobProgress>, "jobId" | "updatedAt">,
) {
  pruneStaleJobs();

  const current = store.jobs.get(jobId);
  const next: ImportJobProgress = {
    jobId,
    status: partial.status ?? current?.status ?? "pending",
    phase: partial.phase ?? current?.phase ?? "pending",
    totalRows: partial.totalRows ?? current?.totalRows ?? 0,
    processedRows: partial.processedRows ?? current?.processedRows ?? 0,
    successCount: partial.successCount ?? current?.successCount ?? 0,
    failureCount: partial.failureCount ?? current?.failureCount ?? 0,
    message: partial.message ?? current?.message,
    durationMs: partial.durationMs ?? current?.durationMs,
    timing: partial.timing ?? current?.timing,
    updatedAt: Date.now(),
  };

  store.jobs.set(jobId, next);

  const listeners = store.listeners.get(jobId);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(next);
  }
}

export function getImportProgress(jobId: string): ImportJobProgress | null {
  pruneStaleJobs();
  return store.jobs.get(jobId) ?? null;
}

export function subscribeImportProgress(jobId: string, listener: Listener) {
  const listeners = store.listeners.get(jobId) ?? new Set<Listener>();
  listeners.add(listener);
  store.listeners.set(jobId, listeners);

  return () => {
    const activeListeners = store.listeners.get(jobId);
    if (!activeListeners) {
      return;
    }

    activeListeners.delete(listener);
    if (activeListeners.size === 0) {
      store.listeners.delete(jobId);
    }
  };
}
