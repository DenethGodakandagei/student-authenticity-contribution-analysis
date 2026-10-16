import { RetryEngine } from './retry';
export interface BatchSyncOptions {
    batchSize?: number;
    retryEngine?: RetryEngine;
    onStatusUpdate?: () => void;
}
/**
 * Register the online checker function (provided by health-check.ts).
 */
export declare function setOnlineStatusChecker(checker: () => boolean): void;
/**
 * Check if a batch sync is currently in progress.
 */
export declare function isCurrentlySyncing(): boolean;
/**
 * Trigger batch synchronization of pending telemetry events from SQLite to backend.
 *
 * 1. Checks if online.
 * 2. Queries up to batchSize (default 100) pending events from SQLite.
 * 3. POSTs batch to /api/telemetry/sync.
 * 4. On 200 OK: marks event UUIDs as synced (sync_status = 1), resets retry backoff,
 *    and repeats if more pending events remain.
 * 5. On failure: delegates to retry engine with exponential backoff and updates status bar.
 *
 * @returns Object with sync outcome summary
 */
export declare function triggerBatchSync(options?: BatchSyncOptions): Promise<{
    success: boolean;
    syncedCount: number;
    pendingRemaining: number;
    error?: string;
}>;
