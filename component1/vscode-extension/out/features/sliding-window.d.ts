import { WindowFeatures } from '../types';
export declare const DEFAULT_WINDOW_SIZE_MS: number;
export declare const DEFAULT_STEP_INTERVAL_MS: number;
export type WindowComputedListener = (windowFeatures: WindowFeatures) => void;
export declare class SlidingWindowManager {
    private timer;
    private windowSizeMs;
    private stepIntervalMs;
    private recentWindows;
    private maxHistory;
    private listeners;
    private isRunning;
    constructor(windowSizeMs?: number, stepIntervalMs?: number);
    /**
     * Start sliding window computation at the configured step interval.
     */
    start(stepIntervalMs?: number, windowSizeMs?: number): void;
    /**
     * Stop the sliding window scheduler.
     */
    stop(): void;
    /**
     * Compute features for a 5-minute window ending at `windowEnd` (default: now).
     */
    computeCurrentWindow(windowEnd?: number): WindowFeatures;
    /**
     * Get all recently computed window feature objects.
     */
    getRecentWindows(): WindowFeatures[];
    /**
     * Get the most recently computed window features.
     */
    getLatestWindow(): WindowFeatures | undefined;
    /**
     * Subscribe to window computation events.
     */
    onWindowComputed(listener: WindowComputedListener): {
        dispose: () => void;
    };
}
export declare const defaultSlidingWindowManager: SlidingWindowManager;
