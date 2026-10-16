import { TelemetryEvent, LocalCommit, EditingSession, ReconciledSession } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPORAL RECONCILIATION ENGINE (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReconciliationOptions {
  /**
   * Maximum gap between consecutive edit events to be considered part of the
   * same editing session. Default: 5 minutes (300,000ms).
   */
  proximityGapMs?: number;

  /**
   * Maximum timestamp difference between an editing session and a commit
   * for temporal proximity mapping. Default: 30 minutes (1,800,000ms).
   */
  commitWindowMs?: number;

  /**
   * Minimum Jaccard similarity threshold between session modified files and
   * commit files to qualify for file-signature reconciliation. Default: 0.4.
   */
  minSimilarityThreshold?: number;
}

/**
 * Group continuous edit events by timestamp proximity into distinct editing sessions.
 * Consecutive events with intervals <= proximityGapMs are clustered together.
 *
 * @param events Array of telemetry events (will be sorted chronologically)
 * @param proximityGapMs Proximity threshold in ms (default: 5 min)
 * @returns Array of EditingSession clusters
 */
export function groupEventsIntoSessions(
  events: TelemetryEvent[],
  proximityGapMs: number = 5 * 60 * 1000
): EditingSession[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const sessions: EditingSession[] = [];

  let currentCluster: TelemetryEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.timestamp - prev.timestamp <= proximityGapMs) {
      currentCluster.push(curr);
    } else {
      sessions.push(createEditingSession(currentCluster));
      currentCluster = [curr];
    }
  }

  if (currentCluster.length > 0) {
    sessions.push(createEditingSession(currentCluster));
  }

  return sessions;
}

/**
 * Convert a cluster of events into an aggregated EditingSession.
 */
function createEditingSession(cluster: TelemetryEvent[]): EditingSession {
  const startTime = cluster[0].timestamp;
  const endTime = cluster[cluster.length - 1].timestamp;
  const durationSec = Math.max(1, Math.round((endTime - startTime) / 1000));

  const filesSet = new Set<string>();
  let netInsertedChars = 0;
  let netDeletedChars = 0;
  let keystrokeCount = 0;
  let pasteCount = 0;

  for (const evt of cluster) {
    if (evt.file_path && evt.file_path.trim()) {
      filesSet.add(evt.file_path.trim().replace(/\\/g, '/'));
    }

    if (evt.event_type === 'KEYSTROKE') keystrokeCount++;
    if (evt.event_type === 'PASTE_BURST') pasteCount++;

    try {
      if (evt.payload_json) {
        const payload = JSON.parse(evt.payload_json);
        if (typeof payload.insertedChars === 'number') netInsertedChars += payload.insertedChars;
        else if (typeof payload.netInsertedChars === 'number') netInsertedChars += payload.netInsertedChars;
        else if (typeof payload.charCount === 'number' && evt.event_type === 'KEYSTROKE') netInsertedChars += payload.charCount;

        if (typeof payload.deletedChars === 'number') netDeletedChars += payload.deletedChars;
        else if (typeof payload.netDeletedChars === 'number') netDeletedChars += payload.netDeletedChars;
      }
    } catch {
      // ignore parse errors
    }
  }

  return {
    sessionId: cluster[0].session_id || `session_${startTime}`,
    startTime,
    endTime,
    durationSec,
    eventCount: cluster.length,
    filesModified: Array.from(filesSet),
    netInsertedChars,
    netDeletedChars,
    keystrokeCount,
    pasteCount
  };
}

/**
 * Calculate Jaccard file signature similarity between session modified files
 * and commit touched files: |A ∩ B| / |A ∪ B|.
 */
export function calculateFileSimilarity(filesA: string[], filesB: string[]): number {
  if (filesA.length === 0 && filesB.length === 0) return 1.0;
  if (filesA.length === 0 || filesB.length === 0) return 0.0;

  const setA = new Set(filesA.map(f => f.toLowerCase().replace(/\\/g, '/')));
  const setB = new Set(filesB.map(f => f.toLowerCase().replace(/\\/g, '/')));

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }

  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Reconcile editing sessions with Git commits.
 *
 * Algorithm:
 * 1. Clusters edit events into sessions based on timestamp proximity.
 * 2. Checks for exact recorded commit hashes within event rows.
 * 3. Finds nearest Git commits within the configurable temporal window.
 * 4. Compares net file-diff signatures to detect squashed commits or rebases.
 *
 * @param events Telemetry events to cluster and reconcile
 * @param commits Known local Git commits
 * @param options Reconciliation parameters
 * @returns Array of ReconciledSession mappings
 */
export function reconcileEventsWithCommits(
  events: TelemetryEvent[],
  commits: LocalCommit[],
  options?: ReconciliationOptions
): ReconciledSession[] {
  const proximityGapMs = options?.proximityGapMs ?? 5 * 60 * 1000;
  const commitWindowMs = options?.commitWindowMs ?? 30 * 60 * 1000;
  const minSimilarityThreshold = options?.minSimilarityThreshold ?? 0.4;

  const sessions = groupEventsIntoSessions(events, proximityGapMs);
  const reconciled: ReconciledSession[] = [];

  // Index commits by hash for fast lookup
  const commitByHash = new Map<string, LocalCommit>();
  for (const c of commits) {
    if (c.hash) commitByHash.set(c.hash, c);
  }

  for (const session of sessions) {
    // 1. Check if events in session explicitly captured a known commit_sha
    const explicitShas = events
      .filter(e => e.timestamp >= session.startTime && e.timestamp <= session.endTime && e.commit_sha)
      .map(e => e.commit_sha);

    let matchedCommit: LocalCommit | undefined;
    let matchScore = 0;
    let matchMethod: 'exact_hash' | 'temporal_proximity' | 'file_signature' | 'unmatched' = 'unmatched';
    let isSquashedOrRebased = false;

    // Check exact hash
    for (const sha of explicitShas) {
      if (commitByHash.has(sha)) {
        matchedCommit = commitByHash.get(sha);
        matchScore = 1.0;
        matchMethod = 'exact_hash';
        break;
      }
    }

    // 2. Temporal Proximity Search: find nearest commit within window
    if (!matchedCommit && commits.length > 0) {
      let nearestCommit: LocalCommit | undefined;
      let minDistanceMs = Infinity;

      for (const commit of commits) {
        const commitTime = new Date(commit.date).getTime();
        if (isNaN(commitTime)) continue;

        // Check if commit falls within the temporal window around the session
        const distance = Math.abs(commitTime - session.endTime);
        const inWindow = commitTime >= (session.startTime - commitWindowMs) &&
                         commitTime <= (session.endTime + commitWindowMs);

        if (inWindow && distance < minDistanceMs) {
          minDistanceMs = distance;
          nearestCommit = commit;
        }
      }

      if (nearestCommit) {
        matchedCommit = nearestCommit;
        matchMethod = 'temporal_proximity';
        // Score decays as distance approaches commitWindowMs
        matchScore = Math.max(0.5, 1.0 - (minDistanceMs / (commitWindowMs * 1.5)));
      }
    }

    // 3. Squashed / Rebased Detection via Net File-Diff Signatures
    // If not matched or even if temporally matched, check file signature similarity
    let bestSignatureCommit: LocalCommit | undefined;
    let bestSimilarity = 0;

    for (const commit of commits) {
      const commitFiles = commit.filesList || [];
      const similarity = calculateFileSimilarity(session.filesModified, commitFiles);

      if (similarity > bestSimilarity && similarity >= minSimilarityThreshold) {
        bestSimilarity = similarity;
        bestSignatureCommit = commit;
      }
    }

    if (bestSignatureCommit && bestSimilarity >= minSimilarityThreshold) {
      // If we didn't have a match or if the signature match is stronger
      if (!matchedCommit || bestSignatureCommit.hash !== matchedCommit.hash) {
        // High file signature match with different hash or time indicates squashed/rebased commit
        matchedCommit = bestSignatureCommit;
        matchScore = Math.round(bestSimilarity * 100) / 100;
        matchMethod = 'file_signature';
        isSquashedOrRebased = true;
      } else if (bestSignatureCommit.hash === matchedCommit.hash) {
        // Boost score if file signature confirms temporal match
        matchScore = Math.min(1.0, matchScore + 0.1);
      }
    }

    reconciled.push({
      session,
      matchedCommit,
      matchScore: Math.round(matchScore * 100) / 100,
      matchMethod,
      isSquashedOrRebased
    });
  }

  return reconciled;
}
