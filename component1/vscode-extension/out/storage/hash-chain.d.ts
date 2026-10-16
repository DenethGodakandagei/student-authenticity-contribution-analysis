/**
 * The genesis hash used as `previous_hash` for the very first event in the chain.
 * A well-known constant so the chain can be verified from the beginning.
 */
export declare const GENESIS_HASH = "COLLABINTEL_GENESIS_0000000000000000000000000000000000000000";
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
export declare function computeRowHash(previousHash: string, timestamp: number, payloadJson: string): string;
/**
 * Get the `row_hash` of the most recently inserted event.
 * Returns GENESIS_HASH if the database is empty (first event in chain).
 */
export declare function getLastHash(): string;
/**
 * Verify the integrity of the hash chain over a range of rows.
 *
 * Walks the chain from the first row to the last, recomputing each hash
 * and comparing it to the stored value. Returns false on first mismatch.
 *
 * @param limit Maximum number of rows to verify (default: all)
 * @returns Object with validity status and details
 */
export declare function verifyChain(limit?: number): {
    valid: boolean;
    checkedRows: number;
    brokenAtUuid?: string;
    brokenAtIndex?: number;
};
