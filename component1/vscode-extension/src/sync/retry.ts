// ─────────────────────────────────────────────────────────────────────────────
//  RETRY ENGINE — Exponential Backoff with Jitter (Plan 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exponential backoff delay schedule in milliseconds:
 * 1s, 2s, 4s, 8s, 16s, 32s, 60s
 */
export const BACKOFF_DELAYS_MS = [
  1000,   // 1s
  2000,   // 2s
  4000,   // 4s
  8000,   // 8s
  16000,  // 16s
  32000,  // 32s
  60000   // 60s
];

export const MAX_RETRIES = BACKOFF_DELAYS_MS.length; // 7 attempts

/**
 * Calculate delay for a given attempt index (0-indexed).
 * @param attempt 0-indexed attempt count
 * @param withJitter whether to add 0-500ms jitter
 */
export function calculateBackoffDelay(attempt: number, withJitter: boolean = true): number {
  const index = Math.min(Math.max(0, attempt), BACKOFF_DELAYS_MS.length - 1);
  const baseDelay = BACKOFF_DELAYS_MS[index];
  const jitter = withJitter ? Math.floor(Math.random() * 501) : 0;
  return baseDelay + jitter;
}

export class RetryEngine {
  private consecutiveFailures: number = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private maxRetries: number;

  constructor(maxRetries: number = MAX_RETRIES) {
    this.maxRetries = maxRetries;
  }

  /**
   * Current number of consecutive sync failures.
   */
  public getFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Check if max retries have been reached before giving up.
   * (Events remain safe in SQLite).
   */
  public isMaxRetriesReached(): boolean {
    return this.consecutiveFailures >= this.maxRetries;
  }

  /**
   * Get the delay in milliseconds for the upcoming retry attempt.
   */
  public getNextDelay(withJitter: boolean = true): number {
    return calculateBackoffDelay(this.consecutiveFailures, withJitter);
  }

  /**
   * Called on successful sync. Resets failure count and clears pending timers.
   */
  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.cancelScheduledRetry();
  }

  /**
   * Called on sync failure.
   * Increments failure count, calculates backoff delay, and optionally
   * schedules a retry callback.
   *
   * @param onRetry Optional callback to invoke after the backoff delay
   * @returns Delay in ms if scheduled, or -1 if max retries reached (gives up)
   */
  public recordFailure(onRetry?: () => void): number {
    this.cancelScheduledRetry();

    if (this.consecutiveFailures >= this.maxRetries) {
      // Max retries reached: give up for now, events remain in SQLite.
      // Next sync attempt will occur when health check recovers or next activity/trigger.
      return -1;
    }

    const delay = this.getNextDelay(true);
    this.consecutiveFailures++;

    if (onRetry) {
      this.retryTimeout = setTimeout(() => {
        this.retryTimeout = null;
        onRetry();
      }, delay);
    }

    return delay;
  }

  /**
   * Cancel any scheduled retry timer.
   */
  public cancelScheduledRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Reset the retry engine back to initial state.
   */
  public reset(): void {
    this.cancelScheduledRetry();
    this.consecutiveFailures = 0;
  }
}

// Global default singleton instance
export const defaultRetryEngine = new RetryEngine();
