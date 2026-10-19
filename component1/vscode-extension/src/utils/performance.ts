import * as vscode from 'vscode';
import * as os from 'os';

// ─────────────────────────────────────────────────────────────────────────────
//  PERFORMANCE PROFILER — Micro-profiling, Memory & CPU Monitor (Plan 6)
// ─────────────────────────────────────────────────────────────────────────────

export const SLOW_EVENT_THRESHOLD_MS = 15;
export const RSS_MEMORY_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50MB

let perfOutputChannel: vscode.OutputChannel | null = null;
let monitorTimer: NodeJS.Timeout | null = null;
let lastCpuUsage: NodeJS.CpuUsage | null = null;
let lastCpuSampleTime = 0;
let lastEstimatedCpuPercent = 0;

export interface SlowOperationRecord {
  name: string;
  durationMs: number;
  thresholdMs: number;
  timestamp: string;
}

const slowOperationsHistory: SlowOperationRecord[] = [];
const MAX_SLOW_RECORDS = 50;

/**
 * Get or create the dedicated Performance Profiler output channel.
 */
export function getPerformanceOutputChannel(): vscode.OutputChannel {
  if (!perfOutputChannel) {
    perfOutputChannel = vscode.window.createOutputChannel('INCODE: Performance Profiler');
  }
  return perfOutputChannel;
}

/**
 * Record a slow hook execution and log to output channel and console.
 */
function recordSlowHook(name: string, durationMs: number, thresholdMs: number): void {
  const record: SlowOperationRecord = {
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
  } catch {
    // Channel may not be initialized yet in test environments
  }
}

/**
 * Wrap a synchronous sensor hook or event capture callback in a performance.now() timer.
 * Logs a warning if execution takes > thresholdMs (default 15ms).
 */
export function profileHook<T>(
  name: string,
  fn: () => T,
  thresholdMs: number = SLOW_EVENT_THRESHOLD_MS
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const elapsed = performance.now() - start;
    if (elapsed > thresholdMs) {
      recordSlowHook(name, elapsed, thresholdMs);
    }
  }
}

/**
 * Wrap an asynchronous sensor hook in a performance.now() timer.
 * Logs a warning if execution takes > thresholdMs (default 15ms).
 */
export async function profileAsyncHook<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs: number = SLOW_EVENT_THRESHOLD_MS
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const elapsed = performance.now() - start;
    if (elapsed > thresholdMs) {
      recordSlowHook(name, elapsed, thresholdMs);
    }
  }
}

/**
 * Perform a single RSS memory check against the 50MB target.
 * @returns Object with current RSS usage and whether it exceeded threshold.
 */
export function checkMemoryUsage(thresholdBytes: number = RSS_MEMORY_THRESHOLD_BYTES): {
  rssBytes: number;
  rssFormatted: string;
  isHigh: boolean;
} {
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
    } catch {
      // Channel may not be initialized
    }
  }

  return { rssBytes: rss, rssFormatted, isHigh };
}

/**
 * Estimate CPU utilization percentage over the sample window.
 */
export function estimateCpuUtilization(): number {
  const currentUsage = process.cpuUsage();
  const currentTime = Date.now();

  if (!lastCpuUsage || lastCpuSampleTime === 0) {
    lastCpuUsage = currentUsage;
    lastCpuSampleTime = currentTime;
    return lastEstimatedCpuPercent;
  }

  const elapsedMs = currentTime - lastCpuSampleTime;
  if (elapsedMs <= 0) return lastEstimatedCpuPercent;

  const userDelta = currentUsage.user - lastCpuUsage.user;     // in microseconds
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

/**
 * Get comprehensive performance summary.
 */
export function getPerformanceStats() {
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

/**
 * Start the periodic performance monitor (runs memory & CPU checks every intervalMs).
 */
export function startPerformanceProfiler(
  context?: vscode.ExtensionContext,
  intervalMs: number = 30000
): void {
  stopPerformanceProfiler();

  const channel = getPerformanceOutputChannel();
  channel.appendLine(`[Performance Profiler] Initialized (hook threshold: ${SLOW_EVENT_THRESHOLD_MS}ms, RSS target: < 50MB)`);

  lastCpuUsage = process.cpuUsage();
  lastCpuSampleTime = Date.now();

  monitorTimer = setInterval(() => {
    const mem = checkMemoryUsage();
    const cpu = estimateCpuUtilization();

    channel.appendLine(
      `[PERF STATS] Memory RSS: ${mem.rssFormatted} | CPU Est: ${cpu}% | Slow Hooks (>15ms): ${slowOperationsHistory.length}`
    );
  }, intervalMs);

  if (context) {
    context.subscriptions.push({
      dispose: () => stopPerformanceProfiler()
    });
  }
}

/**
 * Stop the periodic performance monitor.
 */
export function stopPerformanceProfiler(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}
