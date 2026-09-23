import { queryPending, markSynced, getPendingCount } from '../storage/event-store';
import { postJson } from '../utils/http-client';
import { getConfig } from '../config/settings';
import { defaultRetryEngine, RetryEngine } from './retry';
import { updateTelemetryStatusBar } from '../ui/status-bar';

// ─────────────────────────────────────────────────────────────────────────────
//  BATCH SYNC ENGINE (Plan 4)
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchSyncOptions {
  batchSize?: number;
  retryEngine?: RetryEngine;
  onStatusUpdate?: () => void;
}

let isSyncing = false;
let isOnlineChecker: () => boolean = () => true;

/**
 * Register the online checker function (provided by health-check.ts).
 */
export function setOnlineStatusChecker(checker: () => boolean): void {
  isOnlineChecker = checker;
}

/**
 * Check if a batch sync is currently in progress.
 */
export function isCurrentlySyncing(): boolean {
  return isSyncing;
}

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
export async function triggerBatchSync(
  options?: BatchSyncOptions
): Promise<{ success: boolean; syncedCount: number; pendingRemaining: number; error?: string }> {
  if (isSyncing) {
    return {
      success: false,
      syncedCount: 0,
      pendingRemaining: getPendingCount(),
      error: 'Sync already in progress'
    };
  }

  // If known to be offline, update status bar and abort
  if (!isOnlineChecker()) {
    const pending = getPendingCount();
    updateTelemetryStatusBar(pending > 0 ? 'offline_pending' : 'synced', pending);
    return {
      success: false,
      syncedCount: 0,
      pendingRemaining: pending,
      error: 'Backend is offline'
    };
  }

  const batchSize = options?.batchSize || 100;
  const retryEngine = options?.retryEngine || defaultRetryEngine;
  const cfg = getConfig();

  if (!cfg.serverUrl) {
    return {
      success: false,
      syncedCount: 0,
      pendingRemaining: getPendingCount(),
      error: 'Server URL not configured'
    };
  }

  isSyncing = true;
  let totalSyncedThisRun = 0;

  try {
    let pendingEvents = queryPending(batchSize);

    if (pendingEvents.length === 0) {
      updateTelemetryStatusBar('synced', 0);
      options?.onStatusUpdate?.();
      return {
        success: true,
        syncedCount: 0,
        pendingRemaining: 0
      };
    }

    // Set status bar to syncing state
    updateTelemetryStatusBar('syncing', pendingEvents.length);
    options?.onStatusUpdate?.();

    const url = `${cfg.serverUrl}/api/telemetry/sync`;

    // Process batches in a loop until all pending events are synced or an error occurs
    while (pendingEvents.length > 0) {
      const uuids = pendingEvents.map(e => e.event_uuid);

      const result = await postJson(
        url,
        cfg.authToken,
        { events: pendingEvents },
        15000 // 15s timeout
      );

      if (result.ok) {
        // Mark rows as synced in SQLite
        const changes = markSynced(uuids);
        totalSyncedThisRun += changes;

        // Reset retry backoff
        retryEngine.recordSuccess();

        // Check for remaining pending events
        pendingEvents = queryPending(batchSize);
        if (pendingEvents.length > 0) {
          updateTelemetryStatusBar('syncing', getPendingCount());
          options?.onStatusUpdate?.();
        }
      } else {
        const errorMsg = result.data?.error || `HTTP ${result.statusCode || 'Error'}`;
        throw new Error(errorMsg);
      }
    }

    // All pending events synced
    updateTelemetryStatusBar('synced', 0);
    options?.onStatusUpdate?.();

    return {
      success: true,
      syncedCount: totalSyncedThisRun,
      pendingRemaining: 0
    };
  } catch (err: any) {
    const remainingPending = getPendingCount();
    console.warn(`[BatchSync] Sync failed (${err.message}). Pending events: ${remainingPending}`);

    // Delegate to retry engine with exponential backoff
    const nextDelay = retryEngine.recordFailure(() => {
      // Automatic retry triggered after backoff
      triggerBatchSync(options);
    });

    if (nextDelay > 0) {
      console.log(`[BatchSync] Scheduled retry in ${nextDelay}ms (attempt #${retryEngine.getFailures()})`);
    } else {
      console.warn('[BatchSync] Max retries reached. Events remain buffered in SQLite.');
    }

    updateTelemetryStatusBar('offline_pending', remainingPending);
    options?.onStatusUpdate?.();

    return {
      success: false,
      syncedCount: totalSyncedThisRun,
      pendingRemaining: remainingPending,
      error: err.message
    };
  } finally {
    isSyncing = false;
  }
}
