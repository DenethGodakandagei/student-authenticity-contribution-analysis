"use strict";
// ─────────────────────────────────────────────────────────────────────────────
//  RETRY ENGINE — Exponential Backoff with Jitter (Plan 4)
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRetryEngine = exports.RetryEngine = exports.calculateBackoffDelay = exports.MAX_RETRIES = exports.BACKOFF_DELAYS_MS = void 0;
/**
 * Exponential backoff delay schedule in milliseconds:
 * 1s, 2s, 4s, 8s, 16s, 32s, 60s
 */
exports.BACKOFF_DELAYS_MS = [
    1000,
    2000,
    4000,
    8000,
    16000,
    32000,
    60000 // 60s
];
exports.MAX_RETRIES = exports.BACKOFF_DELAYS_MS.length; // 7 attempts
/**
 * Calculate delay for a given attempt index (0-indexed).
 * @param attempt 0-indexed attempt count
 * @param withJitter whether to add 0-500ms jitter
 */
function calculateBackoffDelay(attempt, withJitter = true) {
    const index = Math.min(Math.max(0, attempt), exports.BACKOFF_DELAYS_MS.length - 1);
    const baseDelay = exports.BACKOFF_DELAYS_MS[index];
    const jitter = withJitter ? Math.floor(Math.random() * 501) : 0;
    return baseDelay + jitter;
}
exports.calculateBackoffDelay = calculateBackoffDelay;
class RetryEngine {
    constructor(maxRetries = exports.MAX_RETRIES) {
        this.consecutiveFailures = 0;
        this.retryTimeout = null;
        this.maxRetries = maxRetries;
    }
    /**
     * Current number of consecutive sync failures.
     */
    getFailures() {
        return this.consecutiveFailures;
    }
    /**
     * Check if max retries have been reached before giving up.
     * (Events remain safe in SQLite).
     */
    isMaxRetriesReached() {
        return this.consecutiveFailures >= this.maxRetries;
    }
    /**
     * Get the delay in milliseconds for the upcoming retry attempt.
     */
    getNextDelay(withJitter = true) {
        return calculateBackoffDelay(this.consecutiveFailures, withJitter);
    }
    /**
     * Called on successful sync. Resets failure count and clears pending timers.
     */
    recordSuccess() {
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
    recordFailure(onRetry) {
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
    cancelScheduledRetry() {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
    }
    /**
     * Reset the retry engine back to initial state.
     */
    reset() {
        this.cancelScheduledRetry();
        this.consecutiveFailures = 0;
    }
}
exports.RetryEngine = RetryEngine;
// Global default singleton instance
exports.defaultRetryEngine = new RetryEngine();
//# sourceMappingURL=retry.js.map