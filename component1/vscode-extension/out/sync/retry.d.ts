/**
 * Exponential backoff delay schedule in milliseconds:
 * 1s, 2s, 4s, 8s, 16s, 32s, 60s
 */
export declare const BACKOFF_DELAYS_MS: number[];
export declare const MAX_RETRIES: number;
/**
 * Calculate delay for a given attempt index (0-indexed).
 * @param attempt 0-indexed attempt count
 * @param withJitter whether to add 0-500ms jitter
 */
export declare function calculateBackoffDelay(attempt: number, withJitter?: boolean): number;
export declare class RetryEngine {
    private consecutiveFailures;
    private retryTimeout;
    private maxRetries;
    constructor(maxRetries?: number);
    /**
     * Current number of consecutive sync failures.
     */
    getFailures(): number;
    /**
     * Check if max retries have been reached before giving up.
     * (Events remain safe in SQLite).
     */
    isMaxRetriesReached(): boolean;
    /**
     * Get the delay in milliseconds for the upcoming retry attempt.
     */
    getNextDelay(withJitter?: boolean): number;
    /**
     * Called on successful sync. Resets failure count and clears pending timers.
     */
    recordSuccess(): void;
    /**
     * Called on sync failure.
     * Increments failure count, calculates backoff delay, and optionally
     * schedules a retry callback.
     *
     * @param onRetry Optional callback to invoke after the backoff delay
     * @returns Delay in ms if scheduled, or -1 if max retries reached (gives up)
     */
    recordFailure(onRetry?: () => void): number;
    /**
     * Cancel any scheduled retry timer.
     */
    cancelScheduledRetry(): void;
    /**
     * Reset the retry engine back to initial state.
     */
    reset(): void;
}
export declare const defaultRetryEngine: RetryEngine;
