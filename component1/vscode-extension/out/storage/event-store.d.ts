import { TelemetryEvent, EventType, EventCategory, QueueStatus } from '../types';
/**
 * Insert a new telemetry event into the SQLite database.
 *
 * Automatically:
 *  - Generates a UUIDv4 for event_uuid
 *  - Retrieves the previous row_hash for chain linking
 *  - Computes the SHA-256 row_hash
 *  - Sets sync_status = 0 (Pending)
 *
 * @param event Partial event (without UUID, hashes, sync_status, created_at)
 * @returns The fully populated TelemetryEvent that was inserted
 */
export declare function insertEvent(event: {
    session_id: string;
    student_id: string;
    task_id: string;
    repo_id: string;
    branch: string;
    commit_sha: string;
    event_type: EventType;
    category: EventCategory;
    file_path: string;
    timestamp: number;
    payload_json: string;
}): TelemetryEvent;
/**
 * Batch-insert multiple events in a single transaction for performance.
 * Used when storing many events at once (e.g., bulk import, session replay).
 */
export declare function insertEventsBatch(events: Array<{
    session_id: string;
    student_id: string;
    task_id: string;
    repo_id: string;
    branch: string;
    commit_sha: string;
    event_type: EventType;
    category: EventCategory;
    file_path: string;
    timestamp: number;
    payload_json: string;
}>): TelemetryEvent[];
/**
 * Query pending (unsynced) events, ordered by timestamp.
 *
 * @param limit Maximum number of events to return (default: 100)
 * @returns Array of TelemetryEvent rows ready for batch sync
 */
export declare function queryPending(limit?: number): TelemetryEvent[];
/**
 * Query all telemetry events within a specific timestamp window [startTime, endTime].
 * Used by the sliding window manager and ML feature calculator.
 *
 * @param startTime Unix epoch ms inclusive
 * @param endTime Unix epoch ms inclusive
 * @returns Array of TelemetryEvent rows sorted chronologically
 */
export declare function queryEventsByTimeRange(startTime: number, endTime: number): TelemetryEvent[];
/**
 * Mark events as synced (sync_status = 1) after successful server upload.
 *
 * @param eventUuids Array of event UUIDs that were successfully synced
 * @returns Number of rows updated
 */
export declare function markSynced(eventUuids: string[]): number;
/**
 * Prune old records: delete synced events older than RETENTION_DAYS (7 days).
 * Only deletes events with sync_status = 1 (already uploaded).
 *
 * @returns Number of rows deleted
 */
export declare function pruneOldRecords(): number;
/**
 * Get queue status for audit viewer / status display.
 *
 * @param globalStoragePath Path for computing storage size
 * @returns QueueStatus object with counts, timestamps, size, and chain validity
 */
export declare function getQueueStatus(globalStoragePath: string): QueueStatus;
/**
 * Get the count of pending (unsynced) events.
 * Lightweight query for status bar display.
 */
export declare function getPendingCount(): number;
