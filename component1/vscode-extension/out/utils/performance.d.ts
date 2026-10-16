import * as vscode from 'vscode';
export declare const SLOW_EVENT_THRESHOLD_MS = 15;
export declare const RSS_MEMORY_THRESHOLD_BYTES: number;
export interface SlowOperationRecord {
    name: string;
    durationMs: number;
    thresholdMs: number;
    timestamp: string;
}
/**
 * Get or create the dedicated Performance Profiler output channel.
 */
export declare function getPerformanceOutputChannel(): vscode.OutputChannel;
/**
 * Wrap a synchronous sensor hook or event capture callback in a performance.now() timer.
 * Logs a warning if execution takes > thresholdMs (default 15ms).
 */
export declare function profileHook<T>(name: string, fn: () => T, thresholdMs?: number): T;
/**
 * Wrap an asynchronous sensor hook in a performance.now() timer.
 * Logs a warning if execution takes > thresholdMs (default 15ms).
 */
export declare function profileAsyncHook<T>(name: string, fn: () => Promise<T>, thresholdMs?: number): Promise<T>;
/**
 * Perform a single RSS memory check against the 50MB target.
 * @returns Object with current RSS usage and whether it exceeded threshold.
 */
export declare function checkMemoryUsage(thresholdBytes?: number): {
    rssBytes: number;
    rssFormatted: string;
    isHigh: boolean;
};
/**
 * Estimate CPU utilization percentage over the sample window.
 */
export declare function estimateCpuUtilization(): number;
/**
 * Get comprehensive performance summary.
 */
export declare function getPerformanceStats(): {
    rssBytes: number;
    rssFormatted: string;
    isMemoryHigh: boolean;
    cpuPercent: number;
    slowOperationsCount: number;
    recentSlowOperations: SlowOperationRecord[];
};
/**
 * Start the periodic performance monitor (runs memory & CPU checks every intervalMs).
 */
export declare function startPerformanceProfiler(context?: vscode.ExtensionContext, intervalMs?: number): void;
/**
 * Stop the periodic performance monitor.
 */
export declare function stopPerformanceProfiler(): void;
