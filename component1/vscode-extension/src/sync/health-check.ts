import { getJson } from '../utils/http-client';
import { triggerBatchSync, setOnlineStatusChecker } from './batch-sync';
import { updateTelemetryStatusBar } from '../ui/status-bar';
import { getPendingCount } from '../storage/event-store';

// ─────────────────────────────────────────────────────────────────────────────
//  HEALTH CHECK POLLING & CONNECTIVITY MONITOR (Plan 4)
// ─────────────────────────────────────────────────────────────────────────────

export type HealthChangeListener = (isOnline: boolean, previousState: boolean) => void;

export class HealthCheckMonitor {
  private isOnlineState: boolean = true; // Optimistic initial assumption
  private pollIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private serverUrl: string = '';
  private listeners: Set<HealthChangeListener> = new Set();
  private hasPerformedFirstCheck: boolean = false;

  constructor(defaultIntervalMs: number = 15000) {
    this.pollIntervalMs = defaultIntervalMs;
    // Register online checker into batch sync
    setOnlineStatusChecker(() => this.isOnline());
  }

  /**
   * Current online status of the backend server.
   */
  public isOnline(): boolean {
    return this.isOnlineState;
  }

  /**
   * Register a listener for status transitions.
   */
  public onStatusChange(listener: HealthChangeListener): { dispose: () => void } {
    this.listeners.add(listener);
    return {
      dispose: () => this.listeners.delete(listener)
    };
  }

  /**
   * Start 15s health check polling.
   */
  public start(serverUrl: string, intervalMs: number = 15000): void {
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
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Perform an on-demand GET /api/health check.
   */
  public async checkHealthNow(): Promise<boolean> {
    if (!this.serverUrl) {
      this.updateState(false);
      return false;
    }

    const healthUrl = `${this.serverUrl}/api/health`;

    try {
      const res = await getJson(healthUrl, undefined, 5000);
      const ok = res.ok && res.data?.status === 'ok';
      this.updateState(ok);
      return ok;
    } catch {
      this.updateState(false);
      return false;
    }
  }

  /**
   * Internal state transition handler.
   */
  private updateState(newOnlineState: boolean): void {
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
        } catch (err) {
          console.error('[HealthCheck] Error in status change listener:', err);
        }
      }

      if (newOnlineState) {
        // RECOVERY (offline -> online): Trigger batch synchronization of buffered SQLite events
        console.log('[HealthCheck] Server online / recovered. Triggering batch sync...');
        triggerBatchSync();
      } else {
        // TRANSITION TO OFFLINE: Update status bar with pending count
        const pending = getPendingCount();
        updateTelemetryStatusBar('offline_pending', pending);
      }
    }
  }
}

// Global default singleton instance
export const defaultHealthCheckMonitor = new HealthCheckMonitor();
