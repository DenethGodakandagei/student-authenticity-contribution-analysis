import { getDatabase, getDatabaseSizeBytes } from './database';
import { computeRowHash, getLastHash, verifyChain } from './hash-chain';
import { generateUUID } from '../utils/uuid';
import { TelemetryEvent, EventType, EventCategory, QueueStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  EVENT STORE — CRUD Operations on the telemetry_events table
// ─────────────────────────────────────────────────────────────────────────────

/** Retention period: auto-delete synced events older than 7 days */
const RETENTION_DAYS = 7;

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
export function insertEvent(event: {
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
}): TelemetryEvent {
  const db = getDatabase();
  const eventUuid = generateUUID();
  const previousHash = getLastHash();
  const rowHash = computeRowHash(previousHash, event.timestamp, event.payload_json);
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO telemetry_events (
      event_uuid, session_id, student_id, task_id, repo_id, branch,
      commit_sha, event_type, category, file_path, timestamp,
      payload_json, sync_status, previous_hash, row_hash, created_at
    ) VALUES (
      @event_uuid, @session_id, @student_id, @task_id, @repo_id, @branch,
      @commit_sha, @event_type, @category, @file_path, @timestamp,
      @payload_json, @sync_status, @previous_hash, @row_hash, @created_at
    )
  `);

  const fullEvent: TelemetryEvent = {
    event_uuid: eventUuid,
    session_id: event.session_id,
    student_id: event.student_id,
    task_id: event.task_id,
    repo_id: event.repo_id,
    branch: event.branch,
    commit_sha: event.commit_sha,
    event_type: event.event_type,
    category: event.category,
    file_path: event.file_path,
    timestamp: event.timestamp,
    payload_json: event.payload_json,
    sync_status: 0,
    previous_hash: previousHash,
    row_hash: rowHash,
    created_at: createdAt
  };

  stmt.run(fullEvent);
  return fullEvent;
}

/**
 * Batch-insert multiple events in a single transaction for performance.
 * Used when storing many events at once (e.g., bulk import, session replay).
 */
export function insertEventsBatch(events: Array<{
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
}>): TelemetryEvent[] {
  const db = getDatabase();
  const results: TelemetryEvent[] = [];

  const stmt = db.prepare(`
    INSERT INTO telemetry_events (
      event_uuid, session_id, student_id, task_id, repo_id, branch,
      commit_sha, event_type, category, file_path, timestamp,
      payload_json, sync_status, previous_hash, row_hash, created_at
    ) VALUES (
      @event_uuid, @session_id, @student_id, @task_id, @repo_id, @branch,
      @commit_sha, @event_type, @category, @file_path, @timestamp,
      @payload_json, @sync_status, @previous_hash, @row_hash, @created_at
    )
  `);

  const insertAll = db.transaction(() => {
    let prevHash = getLastHash();
    const now = new Date().toISOString();

    for (const event of events) {
      const eventUuid = generateUUID();
      const rowHash = computeRowHash(prevHash, event.timestamp, event.payload_json);

      const fullEvent: TelemetryEvent = {
        event_uuid: eventUuid,
        session_id: event.session_id,
        student_id: event.student_id,
        task_id: event.task_id,
        repo_id: event.repo_id,
        branch: event.branch,
        commit_sha: event.commit_sha,
        event_type: event.event_type,
        category: event.category,
        file_path: event.file_path,
        timestamp: event.timestamp,
        payload_json: event.payload_json,
        sync_status: 0,
        previous_hash: prevHash,
        row_hash: rowHash,
        created_at: now
      };

      stmt.run(fullEvent);
      results.push(fullEvent);
      prevHash = rowHash; // chain continues
    }
  });

  insertAll();
  return results;
}

/**
 * Query pending (unsynced) events, ordered by timestamp.
 * 
 * @param limit Maximum number of events to return (default: 100)
 * @returns Array of TelemetryEvent rows ready for batch sync
 */
export function queryPending(limit: number = 100): TelemetryEvent[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM telemetry_events WHERE sync_status = 0 ORDER BY timestamp ASC LIMIT ?'
  ).all(limit) as TelemetryEvent[];
}

/**
 * Query all telemetry events within a specific timestamp window [startTime, endTime].
 * Used by the sliding window manager and ML feature calculator.
 *
 * @param startTime Unix epoch ms inclusive
 * @param endTime Unix epoch ms inclusive
 * @returns Array of TelemetryEvent rows sorted chronologically
 */
export function queryEventsByTimeRange(startTime: number, endTime: number): TelemetryEvent[] {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM telemetry_events WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC'
  ).all(startTime, endTime) as TelemetryEvent[];
}

/**
 * Mark events as synced (sync_status = 1) after successful server upload.
 * 
 * @param eventUuids Array of event UUIDs that were successfully synced
 * @returns Number of rows updated
 */
export function markSynced(eventUuids: string[]): number {
  if (eventUuids.length === 0) return 0;

  const db = getDatabase();
  const placeholders = eventUuids.map(() => '?').join(',');
  const stmt = db.prepare(
    `UPDATE telemetry_events SET sync_status = 1 WHERE event_uuid IN (${placeholders})`
  );

  const result = stmt.run(...eventUuids);
  return result.changes;
}

/**
 * Prune old records: delete synced events older than RETENTION_DAYS (7 days).
 * Only deletes events with sync_status = 1 (already uploaded).
 * 
 * @returns Number of rows deleted
 */
export function pruneOldRecords(): number {
  const db = getDatabase();
  const cutoffMs = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = db.prepare(
    'DELETE FROM telemetry_events WHERE sync_status = 1 AND timestamp < ?'
  ).run(cutoffMs);
  return result.changes;
}

/**
 * Get queue status for audit viewer / status display.
 * 
 * @param globalStoragePath Path for computing storage size
 * @returns QueueStatus object with counts, timestamps, size, and chain validity
 */
export function getQueueStatus(globalStoragePath: string): QueueStatus {
  const db = getDatabase();

  const total = db.prepare(
    'SELECT COUNT(*) as c FROM telemetry_events'
  ).get() as { c: number };

  const pending = db.prepare(
    'SELECT COUNT(*) as c FROM telemetry_events WHERE sync_status = 0'
  ).get() as { c: number };

  const synced = db.prepare(
    'SELECT COUNT(*) as c FROM telemetry_events WHERE sync_status = 1'
  ).get() as { c: number };

  const oldestPending = db.prepare(
    'SELECT MIN(timestamp) as ts FROM telemetry_events WHERE sync_status = 0'
  ).get() as { ts: number | null };

  const newestPending = db.prepare(
    'SELECT MAX(timestamp) as ts FROM telemetry_events WHERE sync_status = 0'
  ).get() as { ts: number | null };

  // Verify chain on a sample (last 50 rows for performance)
  const chainResult = verifyChain(50);

  return {
    totalEvents: total.c,
    pendingCount: pending.c,
    syncedCount: synced.c,
    oldestPendingTimestamp: oldestPending.ts,
    newestPendingTimestamp: newestPending.ts,
    storageBytes: getDatabaseSizeBytes(globalStoragePath),
    hashChainValid: chainResult.valid
  };
}

/**
 * Get the count of pending (unsynced) events.
 * Lightweight query for status bar display.
 */
export function getPendingCount(): number {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT COUNT(*) as c FROM telemetry_events WHERE sync_status = 0'
  ).get() as { c: number };
  return row.c;
}
