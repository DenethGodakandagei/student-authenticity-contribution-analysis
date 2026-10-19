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
exports.stopPerformanceProfiler = exports.startPerformanceProfiler = exports.getPerformanceStats = exports.estimateCpuUtilization = exports.checkMemoryUsage = exports.profileAsyncHook = exports.profileHook = exports.getPerformanceOutputChannel = exports.RSS_MEMORY_THRESHOLD_BYTES = exports.SLOW_EVENT_THRESHOLD_MS = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
// ─────────────────────────────────────────────────────────────────────────────
//  PERFORMANCE PROFILER — Micro-profiling, Memory & CPU Monitor (Plan 6)
// ─────────────────────────────────────────────────────────────────────────────
exports.SLOW_EVENT_THRESHOLD_MS = 15;
exports.RSS_MEMORY_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50MB
let perfOutputChannel = null;
let monitorTimer = null;
let lastCpuUsage = null;
let lastCpuSampleTime = 0;
let lastEstimatedCpuPercent = 0;
const slowOperationsHistory = [];
const MAX_SLOW_RECORDS = 50;
/**
 * Get or create the dedicated Performance Profiler output channel.
 */
function getPerformanceOutputChannel() {
    if (!perfOutputChannel) {
        perfOutputChannel = vscode.window.createOutputChannel('INCODE: Performance Profiler');
    }
    return perfOutputChannel;
}
exports.getPerformanceOutputChannel = getPerformanceOutputChannel;
/**
 * Record a slow hook execution and log to output channel and console.
 */
function recordSlowHook(name, durationMs, thresholdMs) {
    const record = {
        name,
        durationMs: Math.round(durationMs * 100) / 100,
        thresholdMs,
        timestamp: new Date().toISOString()
    };
    slowOperationsHistory.unshift(record);
    if (slowOperationsHistory.length > MAX_SLOW_RECORDS) {
        slowOperationsHistory.pop();
    }
    const msg = `[PERF WARNING] Event capture hook '${name}' took ${durationMs.toFixed(2)}ms (threshold: ${thresholdMs}ms)`;
    console.warn(msg);
    try {
        getPerformanceOutputChannel().appendLine(`⚠️  ${msg}`);
    }
    catch {
        // Channel may not be initialized yet in test environments
    }
}
/**
 * Wrap a synchronous sensor hook or event capture callback in a performance.now() timer.
 * Logs a warning if execution takes > thresholdMs (default 15ms).
 */
function profileHook(name, fn, thresholdMs = exports.SLOW_EVENT_THRESHOLD_MS) {
    const start = performance.now();
    try {
        return fn();
    }
    finally {
        const elapsed = performance.now() - start;
        if (elapsed > thresholdMs) {
            recordSlowHook(name, elapsed, thresholdMs);
        }
    }
}
exports.profileHook = profileHook;
/**
 * Wrap an asynchronous sensor hook in a performance.now() timer.
 * Logs a warning if execution takes > thresholdMs (default 15ms).
 */
async function profileAsyncHook(name, fn, thresholdMs = exports.SLOW_EVENT_THRESHOLD_MS) {
    const start = performance.now();
    try {
        return await fn();
    }
    finally {
        const elapsed = performance.now() - start;
        if (elapsed > thresholdMs) {
            recordSlowHook(name, elapsed, thresholdMs);
        }
    }
}
exports.profileAsyncHook = profileAsyncHook;
/**
 * Perform a single RSS memory check against the 50MB target.
 * @returns Object with current RSS usage and whether it exceeded threshold.
 */
function checkMemoryUsage(thresholdBytes = exports.RSS_MEMORY_THRESHOLD_BYTES) {
    const mem = process.memoryUsage();
    const rss = mem.rss;
    const isHigh = rss > thresholdBytes;
    const rssFormatted = `${(rss / (1024 * 1024)).toFixed(1)} MB`;
    if (isHigh) {
        const thresholdMb = (thresholdBytes / (1024 * 1024)).toFixed(0);
        const msg = `[PERF WARNING] Extension Host RSS Memory: ${rssFormatted} exceeds target threshold of ${thresholdMb}MB`;
        console.warn(msg);
        try {
            getPerformanceOutputChannel().appendLine(`🚨 ${msg}`);
        }
        catch {
            // Channel may not be initialized
        }
    }
    return { rssBytes: rss, rssFormatted, isHigh };
}
exports.checkMemoryUsage = checkMemoryUsage;
/**
 * Estimate CPU utilization percentage over the sample window.
 */
function estimateCpuUtilization() {
    const currentUsage = process.cpuUsage();
    const currentTime = Date.now();
    if (!lastCpuUsage || lastCpuSampleTime === 0) {
        lastCpuUsage = currentUsage;
        lastCpuSampleTime = currentTime;
        return lastEstimatedCpuPercent;
    }
    const elapsedMs = currentTime - lastCpuSampleTime;
    if (elapsedMs <= 0)
        return lastEstimatedCpuPercent;
    const userDelta = currentUsage.user - lastCpuUsage.user; // in microseconds
    const systemDelta = currentUsage.system - lastCpuUsage.system; // in microseconds
    const totalCpuMicroseconds = userDelta + systemDelta;
    const numCpus = os.cpus().length || 1;
    const totalAvailableMicroseconds = elapsedMs * 1000 * numCpus;
    const percent = Math.min(100, Math.max(0, (totalCpuMicroseconds / totalAvailableMicroseconds) * 100));
    lastEstimatedCpuPercent = Math.round(percent * 10) / 10;
    lastCpuUsage = currentUsage;
    lastCpuSampleTime = currentTime;
    return lastEstimatedCpuPercent;
}
exports.estimateCpuUtilization = estimateCpuUtilization;
/**
 * Get comprehensive performance summary.
 */
function getPerformanceStats() {
    const mem = checkMemoryUsage();
    const cpu = estimateCpuUtilization();
    return {
        rssBytes: mem.rssBytes,
        rssFormatted: mem.rssFormatted,
        isMemoryHigh: mem.isHigh,
        cpuPercent: cpu,
        slowOperationsCount: slowOperationsHistory.length,
        recentSlowOperations: [...slowOperationsHistory]
    };
}
exports.getPerformanceStats = getPerformanceStats;
/**
 * Start the periodic performance monitor (runs memory & CPU checks every intervalMs).
 */
function startPerformanceProfiler(context, intervalMs = 30000) {
    stopPerformanceProfiler();
    const channel = getPerformanceOutputChannel();
    channel.appendLine(`[Performance Profiler] Initialized (hook threshold: ${exports.SLOW_EVENT_THRESHOLD_MS}ms, RSS target: < 50MB)`);
    lastCpuUsage = process.cpuUsage();
    lastCpuSampleTime = Date.now();
    monitorTimer = setInterval(() => {
        const mem = checkMemoryUsage();
        const cpu = estimateCpuUtilization();
        channel.appendLine(`[PERF STATS] Memory RSS: ${mem.rssFormatted} | CPU Est: ${cpu}% | Slow Hooks (>15ms): ${slowOperationsHistory.length}`);
    }, intervalMs);
    if (context) {
        context.subscriptions.push({
            dispose: () => stopPerformanceProfiler()
        });
    }
}
exports.startPerformanceProfiler = startPerformanceProfiler;
/**
 * Stop the periodic performance monitor.
 */
function stopPerformanceProfiler() {
    if (monitorTimer) {
        clearInterval(monitorTimer);
        monitorTimer = null;
    }
}
exports.stopPerformanceProfiler = stopPerformanceProfiler;
//# sourceMappingURL=performance.js.map