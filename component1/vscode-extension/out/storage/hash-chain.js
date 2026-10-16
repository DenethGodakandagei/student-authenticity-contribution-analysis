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
exports.verifyChain = exports.getLastHash = exports.computeRowHash = exports.GENESIS_HASH = void 0;
const crypto = __importStar(require("crypto"));
const database_1 = require("./database");
// ─────────────────────────────────────────────────────────────────────────────
//  SHA-256 HASH CHAIN — TAMPER-EVIDENCE LAYER
// ─────────────────────────────────────────────────────────────────────────────
/**
 * The genesis hash used as `previous_hash` for the very first event in the chain.
 * A well-known constant so the chain can be verified from the beginning.
 */
exports.GENESIS_HASH = 'COLLABINTEL_GENESIS_0000000000000000000000000000000000000000';
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
function computeRowHash(previousHash, timestamp, payloadJson) {
    const input = `${previousHash}|${timestamp}|${payloadJson}`;
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
exports.computeRowHash = computeRowHash;
/**
 * Get the `row_hash` of the most recently inserted event.
 * Returns GENESIS_HASH if the database is empty (first event in chain).
 */
function getLastHash() {
    const db = (0, database_1.getDatabase)();
    const row = db.prepare('SELECT row_hash FROM telemetry_events ORDER BY timestamp DESC, rowid DESC LIMIT 1').get();
    return row?.row_hash || exports.GENESIS_HASH;
}
exports.getLastHash = getLastHash;
/**
 * Verify the integrity of the hash chain over a range of rows.
 *
 * Walks the chain from the first row to the last, recomputing each hash
 * and comparing it to the stored value. Returns false on first mismatch.
 *
 * @param limit Maximum number of rows to verify (default: all)
 * @returns Object with validity status and details
 */
function verifyChain(limit) {
    const db = (0, database_1.getDatabase)();
    const query = limit
        ? 'SELECT event_uuid, timestamp, payload_json, previous_hash, row_hash FROM telemetry_events ORDER BY timestamp ASC, rowid ASC LIMIT ?'
        : 'SELECT event_uuid, timestamp, payload_json, previous_hash, row_hash FROM telemetry_events ORDER BY timestamp ASC, rowid ASC';
    const rows = limit
        ? db.prepare(query).all(limit)
        : db.prepare(query).all();
    if (rows.length === 0) {
        return { valid: true, checkedRows: 0 };
    }
    let expectedPreviousHash = exports.GENESIS_HASH;
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
exports.verifyChain = verifyChain;
//# sourceMappingURL=hash-chain.js.map