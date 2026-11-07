// Job pool for background document analysis: limited concurrency, spaced starts, pausable, cancellable.
export function createPool(limit: number, { gapMs = 0 }: { gapMs?: number } = {}) {
  let active = 0;
  let generation = 0;
  let nextStart = 0;
  let pausedUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue: Array<() => Promise<void>> = [];

  const pump = () => {
    clearTimeout(timer);
    while (active < limit && queue.length) {
      const wait = Math.max(pausedUntil, nextStart) - Date.now();
      if (wait > 0) {
        timer = setTimeout(pump, wait);
        return;
      }
      const job = queue.shift()!;
      active++;
      nextStart = Date.now() + gapMs;
      void job()
        .catch(() => {})
        .finally(() => {
          active--;
          pump();
        });
    }
  };

  return {
    /** Jobs receive the generation they were queued in so they can drop results after clear(). */
    add(job: (generation: number) => Promise<void>) {
      const g = generation;
      queue.push(() => job(g));
      pump();
    },
    /** Holds back new jobs for ms (e.g. when the upstream service says it is busy). */
    pause(ms: number) {
      pausedUntil = Math.max(pausedUntil, Date.now() + ms);
    },
    /** Drops queued jobs and marks running ones stale. */
    clear() {
      queue.length = 0;
      generation++;
      clearTimeout(timer);
    },
    isStale(g: number) {
      return g !== generation;
    },
    get active() {
      return active;
    },
    get waiting() {
      return queue.length;
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RetryOptions {
  retries?: number;
  /** Fixed delay, or a function of the attempt number (0 for the first retry). */
  delayMs?: number | ((attempt: number) => number);
  onRetry?: (attempt: number, delayMs: number) => void;
}

/** Runs fn, retrying up to `retries` times while shouldRetry(result) is true. Returns the last result. */
export async function withRetry<T>(fn: () => Promise<T>, shouldRetry: (r: T) => boolean, { retries = 1, delayMs = 2000, onRetry }: RetryOptions = {}): Promise<T> {
  let result = await fn();
  for (let attempt = 0; attempt < retries && shouldRetry(result); attempt++) {
    const delay = typeof delayMs === "function" ? delayMs(attempt) : delayMs;
    onRetry?.(attempt, delay);
    await sleep(delay);
    result = await fn();
  }
  return result;
}

/** 5s, 10s, 20s... capped at 30s, with a little jitter so parallel tabs do not retry in lockstep. */
export const backoffMs = (attempt: number) => Math.min(30_000, 5_000 * 2 ** attempt) + Math.round(Math.random() * 500);
