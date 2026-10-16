"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingCount = exports.getQueueStatus = exports.pruneOldRecords = exports.markSynced = exports.queryEventsByTimeRange = exports.queryPending = exports.insertEventsBatch = exports.insertEvent = void 0;
const database_1 = require("./database");
const hash_chain_1 = require("./hash-chain");
const uuid_1 = require("../utils/uuid");
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
function insertEvent(event) {
    const db = (0, database_1.getDatabase)();
    const eventUuid = (0, uuid_1.generateUUID)();
    const previousHash = (0, hash_chain_1.getLastHash)();
    const rowHash = (0, hash_chain_1.computeRowHash)(previousHash, event.timestamp, event.payload_json);
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
    const fullEvent = {
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
exports.insertEvent = insertEvent;
/**
 * Batch-insert multiple events in a single transaction for performance.
 * Used when storing many events at once (e.g., bulk import, session replay).
 */
function insertEventsBatch(events) {
    const db = (0, database_1.getDatabase)();
    const results = [];
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
        let prevHash = (0, hash_chain_1.getLastHash)();
        const now = new Date().toISOString();
        for (const event of events) {
            const eventUuid = (0, uuid_1.generateUUID)();
            const rowHash = (0, hash_chain_1.computeRowHash)(prevHash, event.timestamp, event.payload_json);
            const fullEvent = {
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
exports.insertEventsBatch = insertEventsBatch;
/**
 * Query pending (unsynced) events, ordered by timestamp.
 *
 * @param limit Maximum number of events to return (default: 100)
 * @returns Array of TelemetryEvent rows ready for batch sync
 */
function queryPending(limit = 100) {
    const db = (0, database_1.getDatabase)();
    return db.prepare('SELECT * FROM telemetry_events WHERE sync_status = 0 ORDER BY timestamp ASC LIMIT ?').all(limit);
}
exports.queryPending = queryPending;
/**
 * Query all telemetry events within a specific timestamp window [startTime, endTime].
 * Used by the sliding window manager and ML feature calculator.
 *
 * @param startTime Unix epoch ms inclusive
 * @param endTime Unix epoch ms inclusive
 * @returns Array of TelemetryEvent rows sorted chronologically
 */
function queryEventsByTimeRange(startTime, endTime) {
    const db = (0, database_1.getDatabase)();
    return db.prepare('SELECT * FROM telemetry_events WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC').all(startTime, endTime);
}
exports.queryEventsByTimeRange = queryEventsByTimeRange;
/**
 * Mark events as synced (sync_status = 1) after successful server upload.
 *
 * @param eventUuids Array of event UUIDs that were successfully synced
 * @returns Number of rows updated
 */
function markSynced(eventUuids) {
    if (eventUuids.length === 0)
        return 0;
    const db = (0, database_1.getDatabase)();
    const placeholders = eventUuids.map(() => '?').join(',');
    const stmt = db.prepare(`UPDATE telemetry_events SET sync_status = 1 WHERE event_uuid IN (${placeholders})`);
    const result = stmt.run(...eventUuids);
    return result.changes;
}
exports.markSynced = markSynced;
/**
 * Prune old records: delete synced events older than RETENTION_DAYS (7 days).
 * Only deletes events with sync_status = 1 (already uploaded).
 *
 * @returns Number of rows deleted
 */
function pruneOldRecords() {
    const db = (0, database_1.getDatabase)();
    const cutoffMs = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = db.prepare('DELETE FROM telemetry_events WHERE sync_status = 1 AND timestamp < ?').run(cutoffMs);
    return result.changes;
}
exports.pruneOldRecords = pruneOldRecords;
/**
 * Get queue status for audit viewer / status display.
 *
 * @param globalStoragePath Path for computing storage size
 * @returns QueueStatus object with counts, timestamps, size, and chain validity
 */
function getQueueStatus(globalStoragePath) {
    const db = (0, database_1.getDatabase)();
    const total = db.prepare('SELECT COUNT(*) as c FROM telemetry_events').get();
    const pending = db.prepare('SELECT COUNT(*) as c FROM telemetry_events WHERE sync_status = 0').get();
    const synced = db.prepare('SELECT COUNT(*) as c FROM telemetry_events WHERE sync_status = 1').get();
    const oldestPending = db.prepare('SELECT MIN(timestamp) as ts FROM telemetry_events WHERE sync_status = 0').get();
    const newestPending = db.prepare('SELECT MAX(timestamp) as ts FROM telemetry_events WHERE sync_status = 0').get();
    // Verify chain on a sample (last 50 rows for performance)
    const chainResult = (0, hash_chain_1.verifyChain)(50);
    return {
        totalEvents: total.c,
        pendingCount: pending.c,
        syncedCount: synced.c,
        oldestPendingTimestamp: oldestPending.ts,
        newestPendingTimestamp: newestPending.ts,
        storageBytes: (0, database_1.getDatabaseSizeBytes)(globalStoragePath),
        hashChainValid: chainResult.valid
    };
}
exports.getQueueStatus = getQueueStatus;
/**
 * Get the count of pending (unsynced) events.
 * Lightweight query for status bar display.
 */
function getPendingCount() {
    const db = (0, database_1.getDatabase)();
    const row = db.prepare('SELECT COUNT(*) as c FROM telemetry_events WHERE sync_status = 0').get();
    return row.c;
}
exports.getPendingCount = getPendingCount;
//# sourceMappingURL=event-store.js.map