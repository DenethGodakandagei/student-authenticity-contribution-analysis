import { TelemetryEvent, WindowFeatures } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  ML FEATURE CALCULATOR (Plan 5)
//  Computes all 18 machine learning features from a window of telemetry events.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute all 18 ML features from a chronological array of TelemetryEvent rows
 * within a defined [windowStart, windowEnd] time slice.
 *
 * @param events Telemetry events occurring within the window
 * @param windowStart Window start timestamp (Unix epoch ms)
 * @param windowEnd Window end timestamp (Unix epoch ms)
 * @param sessionId Optional session identifier
 * @returns Fully populated WindowFeatures object
 */
export function computeWindowFeatures(
  events: TelemetryEvent[],
  windowStart: number,
  windowEnd: number,
  sessionId?: string
): WindowFeatures {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const sessionDurationSec = Math.max(1, Math.round((windowEnd - windowStart) / 1000));
  const resolvedSessionId = sessionId || (sorted[0]?.session_id ?? `window_${windowStart}`);

  if (sorted.length === 0) {
    return {
      windowStart,
      windowEnd,
      sessionId: resolvedSessionId,
      features: {
        activeCodingTimeSec: 0,
        idleTimeSec: sessionDurationSec,
        sessionDurationSec,
        activeTypingDurationSec: 0,
        keystrokeCount: 0,
        pasteCount: 0,
        pastedCharCount: 0,
        pasteToKeystrokeRatio: 0,
        typingVelocity: 0,
        netInsertedChars: 0,
        netDeletedChars: 0,
        codeChurnRatio: 0,
        fileModificationFreq: 0,
        fileCreateDeleteCount: 0,
        explicitSaveCount: 0,
        syntaxErrorCount: 0,
        errorResolutionDurationSec: 0,
        windowFocusTransitions: 0,
        gitOperationsCount: 0
      }
    };
  }

  // 1 & 2: Active Coding Time & Idle Time (gaps < 60s count as active)
  let activeCodingMs = 0;
  let idleMs = 0;

  // Initial gap before first event
  const initialGap = sorted[0].timestamp - windowStart;
  if (initialGap > 60000) {
    idleMs += initialGap;
  } else if (initialGap > 0) {
    activeCodingMs += initialGap;
  }

  for (let i = 0; i < sorted.length; i++) {
    if (i < sorted.length - 1) {
      const gap = sorted[i + 1].timestamp - sorted[i].timestamp;
      if (gap < 60000) {
        activeCodingMs += gap;
      } else {
        // Active threshold for the event itself (e.g. 2s) + idle remainder
        activeCodingMs += 2000;
        idleMs += (gap - 2000);
      }
    } else {
      // Last event in window
      activeCodingMs += 1000;
      const tailGap = windowEnd - sorted[i].timestamp;
      if (tailGap > 60000) {
        idleMs += tailGap;
      } else if (tailGap > 0) {
        activeCodingMs += tailGap;
      }
    }
  }

  const activeCodingTimeSec = Math.min(
    sessionDurationSec,
    Math.max(1, Math.round(activeCodingMs / 1000))
  );
  const idleTimeSec = Math.max(0, sessionDurationSec - activeCodingTimeSec);

  // 4: Active Typing Duration (consecutive KEYSTROKE events with gap < 5s)
  const keystrokeEvents = sorted.filter(e => e.event_type === 'KEYSTROKE');
  let activeTypingMs = 0;

  for (let i = 0; i < keystrokeEvents.length; i++) {
    if (i < keystrokeEvents.length - 1) {
      const gap = keystrokeEvents[i + 1].timestamp - keystrokeEvents[i].timestamp;
      if (gap <= 5000) {
        activeTypingMs += gap;
      } else {
        activeTypingMs += 500; // discrete keystroke credit
      }
    } else {
      activeTypingMs += 500;
    }
  }
  const activeTypingDurationSec = Math.min(
    activeCodingTimeSec,
    Math.round(activeTypingMs / 1000)
  );

  // 5 & 6: Keystroke Count & Paste Count
  const keystrokeCount = keystrokeEvents.length;
  const pasteEvents = sorted.filter(e => e.event_type === 'PASTE_BURST');
  const pasteCount = pasteEvents.length;

  // 7, 9, 10: Character Churn Metrics from Payloads
  let pastedCharCount = 0;
  let netInsertedChars = 0;
  let netDeletedChars = 0;
  let syntaxErrorCount = 0;
  const errorResolutionDurations: number[] = [];

  for (const evt of sorted) {
    let payload: Record<string, any> = {};
    try {
      if (evt.payload_json) {
        payload = JSON.parse(evt.payload_json);
      }
    } catch {
      payload = {};
    }

    // Pasted characters
    if (evt.event_type === 'PASTE_BURST') {
      const chars = payload.charCount || payload.charactersPasted || payload.netInsertedChars || 0;
      pastedCharCount += chars;
    }

    // Inserted / Deleted characters
    if (typeof payload.netInsertedChars === 'number') {
      netInsertedChars += payload.netInsertedChars;
    } else if (typeof payload.insertedChars === 'number') {
      netInsertedChars += payload.insertedChars;
    } else if (evt.event_type === 'KEYSTROKE') {
      netInsertedChars += (payload.charCount || 1);
    } else if (evt.event_type === 'PASTE_BURST') {
      netInsertedChars += (payload.charCount || 0);
    }

    if (typeof payload.netDeletedChars === 'number') {
      netDeletedChars += payload.netDeletedChars;
    } else if (typeof payload.deletedChars === 'number') {
      netDeletedChars += payload.deletedChars;
    }

    // 15: Syntax / Compiler Error Count
    if (evt.event_type === 'DIAGNOSTIC') {
      if (payload.severity === 'error' || payload.currentErrorCount > 0) {
        syntaxErrorCount += (payload.currentErrorCount || 1);
      }
    }

    // 16: Error Resolution Duration
    if (evt.event_type === 'DIAGNOSTIC_RESOLVED' || payload.resolvedAt) {
      if (payload.appearedAt && payload.resolvedAt && payload.resolvedAt >= payload.appearedAt) {
        errorResolutionDurations.push((payload.resolvedAt - payload.appearedAt) / 1000);
      } else if (typeof payload.avgResolutionMs === 'number' && payload.avgResolutionMs > 0) {
        errorResolutionDurations.push(payload.avgResolutionMs / 1000);
      }
    }
  }

  // 8: Paste-to-Keystroke Ratio & Typing Velocity
  const typedChars = Math.max(keystrokeCount, netInsertedChars - pastedCharCount);
  const pasteToKeystrokeRatio = Math.round((pastedCharCount / (typedChars + 1)) * 100) / 100;
  const totalChars = netInsertedChars + netDeletedChars;
  const typingVelocity = Math.round((totalChars / Math.max(1, activeCodingTimeSec)) * 100) / 100;

  // 11: Code Churn Ratio
  const codeChurnRatio = Math.round((netDeletedChars / (netInsertedChars + 1)) * 100) / 100;

  // 12: File Modification Frequency
  const fileModificationEvents = sorted.filter(e =>
    e.event_type === 'KEYSTROKE' ||
    e.event_type === 'PASTE_BURST' ||
    e.event_type === 'SAVE'
  );
  const fileModificationFreq = fileModificationEvents.length;

  // 13: File Creation / Deletion Count
  const fileCreateDeleteCount = sorted.filter(e =>
    e.event_type === 'FILE_CREATE' || e.event_type === 'FILE_DELETE'
  ).length;

  // 14: Explicit Save Count
  const explicitSaveCount = sorted.filter(e => e.event_type === 'SAVE').length;

  // 16: Error Resolution Duration Average
  const errorResolutionDurationSec = errorResolutionDurations.length > 0
    ? Math.round((errorResolutionDurations.reduce((a, b) => a + b, 0) / errorResolutionDurations.length) * 10) / 10
    : 0;

  // 17: Window Focus Transitions
  const windowFocusTransitions = sorted.filter(e => e.event_type === 'FOCUS').length;

  // 18: Git Operations Count
  const gitOperationsCount = sorted.filter(e =>
    e.event_type === 'GIT_COMMIT' || (e.category === 'SYSTEM' && e.file_path === '.git')
  ).length;

  return {
    windowStart,
    windowEnd,
    sessionId: resolvedSessionId,
    features: {
      activeCodingTimeSec,
      idleTimeSec,
      sessionDurationSec,
      activeTypingDurationSec,
      keystrokeCount,
      pasteCount,
      pastedCharCount,
      pasteToKeystrokeRatio,
      typingVelocity,
      netInsertedChars,
      netDeletedChars,
      codeChurnRatio,
      fileModificationFreq,
      fileCreateDeleteCount,
      explicitSaveCount,
      syntaxErrorCount,
      errorResolutionDurationSec,
      windowFocusTransitions,
      gitOperationsCount
    }
  };
}
