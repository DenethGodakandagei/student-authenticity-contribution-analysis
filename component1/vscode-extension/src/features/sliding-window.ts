import { WindowFeatures } from '../types';
import { queryEventsByTimeRange } from '../storage/event-store';
import { computeWindowFeatures } from './feature-calculator';

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDING WINDOW MANAGER (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_WINDOW_SIZE_MS = 5 * 60 * 1000;    // 5 minutes
export const DEFAULT_STEP_INTERVAL_MS = 1 * 60 * 1000;   // 1 minute sliding stride (W=5 min, step=1 min)

export type WindowComputedListener = (windowFeatures: WindowFeatures) => void;

export class SlidingWindowManager {
  private timer: NodeJS.Timeout | null = null;
  private windowSizeMs: number;
  private stepIntervalMs: number;
  private recentWindows: WindowFeatures[] = [];
  private maxHistory: number = 50;
  private listeners: Set<WindowComputedListener> = new Set();
  private isRunning: boolean = false;

  constructor(
    windowSizeMs: number = DEFAULT_WINDOW_SIZE_MS,
    stepIntervalMs: number = DEFAULT_STEP_INTERVAL_MS
  ) {
    this.windowSizeMs = windowSizeMs;
    this.stepIntervalMs = stepIntervalMs;
  }

  /**
   * Start sliding window computation at the configured step interval.
   */
  public start(
    stepIntervalMs: number = this.stepIntervalMs,
    windowSizeMs: number = this.windowSizeMs
  ): void {
    this.stop();
    this.stepIntervalMs = stepIntervalMs;
    this.windowSizeMs = windowSizeMs;
    this.isRunning = true;

    console.log(`[SlidingWindow] Started: window=${this.windowSizeMs / 1000}s, step=${this.stepIntervalMs / 1000}s`);

    // Perform an initial computation shortly after startup
    setTimeout(() => {
      if (this.isRunning) {
        this.computeCurrentWindow();
      }
    }, 5000);

    // Schedule regular 1-minute sliding interval (W=5 min, step=1 min)
    this.timer = setInterval(() => {
      this.computeCurrentWindow();
    }, this.stepIntervalMs);
  }

  /**
   * Stop the sliding window scheduler.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Compute features for a 5-minute window ending at `windowEnd` (default: now).
   */
  public computeCurrentWindow(windowEnd: number = Date.now()): WindowFeatures {
    const windowStart = windowEnd - this.windowSizeMs;

    let events: any[] = [];
    try {
      events = queryEventsByTimeRange(windowStart, windowEnd);
    } catch (err: any) {
      console.warn('[SlidingWindow] Could not query SQLite events:', err.message);
      events = [];
    }

    const windowFeatures = computeWindowFeatures(events, windowStart, windowEnd);

    // Save to rolling memory history
    this.recentWindows.push(windowFeatures);
    if (this.recentWindows.length > this.maxHistory) {
      this.recentWindows.shift();
    }

    console.log(
      `[SlidingWindow] Window computed: [${new Date(windowStart).toLocaleTimeString()} - ${new Date(windowEnd).toLocaleTimeString()}], ` +
      `events=${events.length}, keystrokes=${windowFeatures.features.keystrokeCount}, active=${windowFeatures.features.activeCodingTimeSec}s`
    );

    // Broadcast to listeners
    for (const listener of this.listeners) {
      try {
        listener(windowFeatures);
      } catch (err) {
        console.error('[SlidingWindow] Error in window computed listener:', err);
      }
    }

    return windowFeatures;
  }

  /**
   * Get all recently computed window feature objects.
   */
  public getRecentWindows(): WindowFeatures[] {
    return [...this.recentWindows];
  }

  /**
   * Get the most recently computed window features.
   */
  public getLatestWindow(): WindowFeatures | undefined {
    return this.recentWindows[this.recentWindows.length - 1];
  }

  /**
   * Subscribe to window computation events.
   */
  public onWindowComputed(listener: WindowComputedListener): { dispose: () => void } {
    this.listeners.add(listener);
    return {
      dispose: () => this.listeners.delete(listener)
    };
  }
}

// Global default singleton instance
export const defaultSlidingWindowManager = new SlidingWindowManager();
