import { TelemetryEvent, LocalCommit, EditingSession, ReconciledSession } from '../types';
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
export declare function groupEventsIntoSessions(events: TelemetryEvent[], proximityGapMs?: number): EditingSession[];
/**
 * Calculate Jaccard file signature similarity between session modified files
 * and commit touched files: |A ∩ B| / |A ∪ B|.
 */
export declare function calculateFileSimilarity(filesA: string[], filesB: string[]): number;
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
export declare function reconcileEventsWithCommits(events: TelemetryEvent[], commits: LocalCommit[], options?: ReconciliationOptions): ReconciledSession[];
