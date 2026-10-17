"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSlidingWindowManager = exports.SlidingWindowManager = exports.DEFAULT_STEP_INTERVAL_MS = exports.DEFAULT_WINDOW_SIZE_MS = void 0;
const event_store_1 = require("../storage/event-store");
const feature_calculator_1 = require("./feature-calculator");
// ─────────────────────────────────────────────────────────────────────────────
//  SLIDING WINDOW MANAGER (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────
exports.DEFAULT_WINDOW_SIZE_MS = 5 * 60 * 1000; // 5 minutes
exports.DEFAULT_STEP_INTERVAL_MS = 1 * 60 * 1000; // 1 minute sliding stride (W=5 min, step=1 min)
class SlidingWindowManager {
    constructor(windowSizeMs = exports.DEFAULT_WINDOW_SIZE_MS, stepIntervalMs = exports.DEFAULT_STEP_INTERVAL_MS) {
        this.timer = null;
        this.recentWindows = [];
        this.maxHistory = 50;
        this.listeners = new Set();
        this.isRunning = false;
        this.windowSizeMs = windowSizeMs;
        this.stepIntervalMs = stepIntervalMs;
    }
    /**
     * Start sliding window computation at the configured step interval.
     */
    start(stepIntervalMs = this.stepIntervalMs, windowSizeMs = this.windowSizeMs) {
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
    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * Compute features for a 5-minute window ending at `windowEnd` (default: now).
     */
    computeCurrentWindow(windowEnd = Date.now()) {
        const windowStart = windowEnd - this.windowSizeMs;
        let events = [];
        try {
            events = (0, event_store_1.queryEventsByTimeRange)(windowStart, windowEnd);
        }
        catch (err) {
            console.warn('[SlidingWindow] Could not query SQLite events:', err.message);
            events = [];
        }
        const windowFeatures = (0, feature_calculator_1.computeWindowFeatures)(events, windowStart, windowEnd);
        // Save to rolling memory history
        this.recentWindows.push(windowFeatures);
        if (this.recentWindows.length > this.maxHistory) {
            this.recentWindows.shift();
        }
        console.log(`[SlidingWindow] Window computed: [${new Date(windowStart).toLocaleTimeString()} - ${new Date(windowEnd).toLocaleTimeString()}], ` +
            `events=${events.length}, keystrokes=${windowFeatures.features.keystrokeCount}, active=${windowFeatures.features.activeCodingTimeSec}s`);
        // Broadcast to listeners
        for (const listener of this.listeners) {
            try {
                listener(windowFeatures);
            }
            catch (err) {
                console.error('[SlidingWindow] Error in window computed listener:', err);
            }
        }
        return windowFeatures;
    }
    /**
     * Get all recently computed window feature objects.
     */
    getRecentWindows() {
        return [...this.recentWindows];
    }
    /**
     * Get the most recently computed window features.
     */
    getLatestWindow() {
        return this.recentWindows[this.recentWindows.length - 1];
    }
    /**
     * Subscribe to window computation events.
     */
    onWindowComputed(listener) {
        this.listeners.add(listener);
        return {
            dispose: () => this.listeners.delete(listener)
        };
    }
}
exports.SlidingWindowManager = SlidingWindowManager;
// Global default singleton instance
exports.defaultSlidingWindowManager = new SlidingWindowManager();
//# sourceMappingURL=sliding-window.js.map