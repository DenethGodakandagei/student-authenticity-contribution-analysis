"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerBatchSync = exports.isCurrentlySyncing = exports.setOnlineStatusChecker = void 0;
const event_store_1 = require("../storage/event-store");
const http_client_1 = require("../utils/http-client");
const settings_1 = require("../config/settings");
const retry_1 = require("./retry");
const status_bar_1 = require("../ui/status-bar");
const privacy_1 = require("../security/privacy");
const vscode = __importStar(require("vscode"));
let isSyncing = false;
let isOnlineChecker = () => true;
/**
 * Register the online checker function (provided by health-check.ts).
 */
function setOnlineStatusChecker(checker) {
    isOnlineChecker = checker;
}
exports.setOnlineStatusChecker = setOnlineStatusChecker;
/**
 * Check if a batch sync is currently in progress.
 */
function isCurrentlySyncing() {
    return isSyncing;
}
exports.isCurrentlySyncing = isCurrentlySyncing;
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
async function triggerBatchSync(options) {
    if (isSyncing) {
        return {
            success: false,
            syncedCount: 0,
            pendingRemaining: (0, event_store_1.getPendingCount)(),
            error: 'Sync already in progress'
        };
    }
    // If known to be offline, update status bar and abort
    if (!isOnlineChecker()) {
        const pending = (0, event_store_1.getPendingCount)();
        (0, status_bar_1.updateTelemetryStatusBar)(pending > 0 ? 'offline_pending' : 'synced', pending);
        return {
            success: false,
            syncedCount: 0,
            pendingRemaining: pending,
            error: 'Backend is offline'
        };
    }
    const batchSize = options?.batchSize || 100;
    const retryEngine = options?.retryEngine || retry_1.defaultRetryEngine;
    const cfg = (0, settings_1.getConfig)();
    if (!cfg.serverUrl) {
        return {
            success: false,
            syncedCount: 0,
            pendingRemaining: (0, event_store_1.getPendingCount)(),
            error: 'Server URL not configured'
        };
    }
    isSyncing = true;
    let totalSyncedThisRun = 0;
    try {
        let pendingEvents = (0, event_store_1.queryPending)(batchSize);
        if (pendingEvents.length === 0) {
            (0, status_bar_1.updateTelemetryStatusBar)('synced', 0);
            options?.onStatusUpdate?.();
            return {
                success: true,
                syncedCount: 0,
                pendingRemaining: 0
            };
        }
        // Set status bar to syncing state
        (0, status_bar_1.updateTelemetryStatusBar)('syncing', pendingEvents.length);
        options?.onStatusUpdate?.();
        const url = `${cfg.serverUrl}/api/telemetry/sync`;
        // Process batches in a loop until all pending events are synced or an error occurs
        while (pendingEvents.length > 0) {
            const uuids = pendingEvents.map(e => e.event_uuid);
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            const sanitizedEvents = (0, privacy_1.sanitizePayload)(pendingEvents, workspaceRoot);
            const result = await (0, http_client_1.postJson)(url, cfg.authToken, { events: sanitizedEvents }, 15000 // 15s timeout
            );
            if (result.ok) {
                // Mark rows as synced in SQLite
                const changes = (0, event_store_1.markSynced)(uuids);
                totalSyncedThisRun += changes;
                // Reset retry backoff
                retryEngine.recordSuccess();
                // Check for remaining pending events
                pendingEvents = (0, event_store_1.queryPending)(batchSize);
                if (pendingEvents.length > 0) {
                    (0, status_bar_1.updateTelemetryStatusBar)('syncing', (0, event_store_1.getPendingCount)());
                    options?.onStatusUpdate?.();
                }
            }
            else {
                const errorMsg = result.data?.error || `HTTP ${result.statusCode || 'Error'}`;
                throw new Error(errorMsg);
            }
        }
        // All pending events synced
        (0, status_bar_1.updateTelemetryStatusBar)('synced', 0);
        options?.onStatusUpdate?.();
        return {
            success: true,
            syncedCount: totalSyncedThisRun,
            pendingRemaining: 0
        };
    }
    catch (err) {
        const remainingPending = (0, event_store_1.getPendingCount)();
        console.warn(`[BatchSync] Sync failed (${err.message}). Pending events: ${remainingPending}`);
        // Delegate to retry engine with exponential backoff
        const nextDelay = retryEngine.recordFailure(() => {
            // Automatic retry triggered after backoff
            triggerBatchSync(options);
        });
        if (nextDelay > 0) {
            console.log(`[BatchSync] Scheduled retry in ${nextDelay}ms (attempt #${retryEngine.getFailures()})`);
        }
        else {
            console.warn('[BatchSync] Max retries reached. Events remain buffered in SQLite.');
        }
        (0, status_bar_1.updateTelemetryStatusBar)('offline_pending', remainingPending);
        options?.onStatusUpdate?.();
        return {
            success: false,
            syncedCount: totalSyncedThisRun,
            pendingRemaining: remainingPending,
            error: err.message
        };
    }
    finally {
        isSyncing = false;
    }
}
exports.triggerBatchSync = triggerBatchSync;
//# sourceMappingURL=batch-sync.js.map