import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
//  UUID V4 GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function generateUUID(): string {
  // Use crypto.randomUUID if available (Node 14.17+), fallback to manual
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Manual UUIDv4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
