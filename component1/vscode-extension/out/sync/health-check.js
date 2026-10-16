"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultHealthCheckMonitor = exports.HealthCheckMonitor = void 0;
const http_client_1 = require("../utils/http-client");
const batch_sync_1 = require("./batch-sync");
const status_bar_1 = require("../ui/status-bar");
const event_store_1 = require("../storage/event-store");
class HealthCheckMonitor {
    constructor(defaultIntervalMs = 15000) {
        this.isOnlineState = true; // Optimistic initial assumption
        this.timer = null;
        this.serverUrl = '';
        this.listeners = new Set();
        this.hasPerformedFirstCheck = false;
        this.pollIntervalMs = defaultIntervalMs;
        // Register online checker into batch sync
        (0, batch_sync_1.setOnlineStatusChecker)(() => this.isOnline());
    }
    /**
     * Current online status of the backend server.
     */
    isOnline() {
        return this.isOnlineState;
    }
    /**
     * Register a listener for status transitions.
     */
    onStatusChange(listener) {
        this.listeners.add(listener);
        return {
            dispose: () => this.listeners.delete(listener)
        };
    }
    /**
     * Start 15s health check polling.
     */
    start(serverUrl, intervalMs = 15000) {
        this.stop();
        this.serverUrl = serverUrl.replace(/\/+$/, '');
        this.pollIntervalMs = intervalMs;
        // Perform an immediate initial check
        this.checkHealthNow();
        // Schedule periodic polling every 15s
        this.timer = setInterval(() => {
            this.checkHealthNow();
        }, this.pollIntervalMs);
    }
    /**
     * Stop health check polling.
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * Perform an on-demand GET /api/health check.
     */
    async checkHealthNow() {
        if (!this.serverUrl) {
            this.updateState(false);
            return false;
        }
        const healthUrl = `${this.serverUrl}/api/health`;
        try {
            const res = await (0, http_client_1.getJson)(healthUrl, undefined, 5000);
            const ok = res.ok && res.data?.status === 'ok';
            this.updateState(ok);
            return ok;
        }
        catch {
            this.updateState(false);
            return false;
        }
    }
    /**
     * Internal state transition handler.
     */
    updateState(newOnlineState) {
        const prevState = this.isOnlineState;
        const isTransition = !this.hasPerformedFirstCheck || prevState !== newOnlineState;
        this.hasPerformedFirstCheck = true;
        this.isOnlineState = newOnlineState;
        if (isTransition) {
            console.log(`[HealthCheck] Server state transition: ${prevState ? 'ONLINE' : 'OFFLINE'} -> ${newOnlineState ? 'ONLINE' : 'OFFLINE'}`);
            // Notify all listeners
            for (const listener of this.listeners) {
                try {
                    listener(newOnlineState, prevState);
                }
                catch (err) {
                    console.error('[HealthCheck] Error in status change listener:', err);
                }
            }
            if (newOnlineState) {
                // RECOVERY (offline -> online): Trigger batch synchronization of buffered SQLite events
                console.log('[HealthCheck] Server online / recovered. Triggering batch sync...');
                (0, batch_sync_1.triggerBatchSync)();
            }
            else {
                // TRANSITION TO OFFLINE: Update status bar with pending count
                const pending = (0, event_store_1.getPendingCount)();
                (0, status_bar_1.updateTelemetryStatusBar)('offline_pending', pending);
            }
        }
    }
}
exports.HealthCheckMonitor = HealthCheckMonitor;
// Global default singleton instance
exports.defaultHealthCheckMonitor = new HealthCheckMonitor();
//# sourceMappingURL=health-check.js.map