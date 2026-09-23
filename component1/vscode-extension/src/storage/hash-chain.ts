import * as crypto from 'crypto';
import { getDatabase } from './database';

// ─────────────────────────────────────────────────────────────────────────────
//  SHA-256 HASH CHAIN — TAMPER-EVIDENCE LAYER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The genesis hash used as `previous_hash` for the very first event in the chain.
 * A well-known constant so the chain can be verified from the beginning.
 */
export const GENESIS_HASH = 'COLLABINTEL_GENESIS_0000000000000000000000000000000000000000';

/**
 * Compute the SHA-256 hash for a telemetry event row.
 * 
 * Hash = SHA-256(previous_hash + "|" + timestamp + "|" + payload_json)
 * 
 * This creates a linked chain where each row's hash depends on the previous row,
 * making tampering detectable (modifying any row breaks the chain from that point forward).
 * 
 * @param previousHash The `row_hash` of the preceding event (or GENESIS_HASH for the first)
 * @param timestamp Unix epoch ms of this event
 * @param payloadJson The serialized payload JSON string
 * @returns Hex-encoded SHA-256 hash
 */
export function computeRowHash(previousHash: string, timestamp: number, payloadJson: string): string {
  const input = `${previousHash}|${timestamp}|${payloadJson}`;
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Get the `row_hash` of the most recently inserted event.
 * Returns GENESIS_HASH if the database is empty (first event in chain).
 */
export function getLastHash(): string {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT row_hash FROM telemetry_events ORDER BY timestamp DESC, rowid DESC LIMIT 1'
  ).get() as { row_hash: string } | undefined;

  return row?.row_hash || GENESIS_HASH;
}

/**
 * Verify the integrity of the hash chain over a range of rows.
 * 
 * Walks the chain from the first row to the last, recomputing each hash
 * and comparing it to the stored value. Returns false on first mismatch.
 * 
 * @param limit Maximum number of rows to verify (default: all)
 * @returns Object with validity status and details
 */
export function verifyChain(limit?: number): {
  valid: boolean;
  checkedRows: number;
  brokenAtUuid?: string;
  brokenAtIndex?: number;
} {
  const db = getDatabase();
  const query = limit
    ? 'SELECT event_uuid, timestamp, payload_json, previous_hash, row_hash FROM telemetry_events ORDER BY timestamp ASC, rowid ASC LIMIT ?'
    : 'SELECT event_uuid, timestamp, payload_json, previous_hash, row_hash FROM telemetry_events ORDER BY timestamp ASC, rowid ASC';

  const rows = limit
    ? db.prepare(query).all(limit) as Array<{ event_uuid: string; timestamp: number; payload_json: string; previous_hash: string; row_hash: string }>
    : db.prepare(query).all() as Array<{ event_uuid: string; timestamp: number; payload_json: string; previous_hash: string; row_hash: string }>;

  if (rows.length === 0) {
    return { valid: true, checkedRows: 0 };
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Verify the previous_hash link
    if (row.previous_hash !== expectedPreviousHash) {
      return {
        valid: false,
        checkedRows: i + 1,
        brokenAtUuid: row.event_uuid,
        brokenAtIndex: i
      };
    }

    // Verify the row_hash computation
    const recomputedHash = computeRowHash(row.previous_hash, row.timestamp, row.payload_json);
    if (recomputedHash !== row.row_hash) {
      return {
        valid: false,
        checkedRows: i + 1,
        brokenAtUuid: row.event_uuid,
        brokenAtIndex: i
      };
    }

    // This row's hash becomes the expected previous hash for the next row
    expectedPreviousHash = row.row_hash;
  }

  return { valid: true, checkedRows: rows.length };
}
