import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  SECURITY & PRIVACY HARDENING (Plan 6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of server URL validation.
 */
export interface ServerUrlValidationResult {
  isValid: boolean;
  isSecure: boolean;
  isLocal: boolean;
  warning?: string;
  error?: string;
}

/**
 * Enforce HTTPS for production URLs.
 * Returns a warning if http:// is configured for a remote host (non-localhost).
 */
export function validateServerUrl(rawUrl: string): ServerUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, isSecure: false, isLocal: false, error: 'Server URL is empty' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    return { isValid: false, isSecure: false, isLocal: false, error: `Invalid URL format: ${err.message}` };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local');

  if (parsed.protocol === 'https:') {
    return { isValid: true, isSecure: true, isLocal };
  }

  if (parsed.protocol === 'http:') {
    if (isLocal) {
      return { isValid: true, isSecure: true, isLocal: true };
    }
    const warning = `Insecure connection: CollabIntel server URL is using HTTP for remote host '${hostname}'. HTTPS is required for production.`;
    return { isValid: true, isSecure: false, isLocal: false, warning };
  }

  return { isValid: false, isSecure: false, isLocal, error: `Unsupported protocol '${parsed.protocol}'. Use http:// or https://` };
}

/**
 * Check server URL and prompt user with VS Code warning notification if insecure HTTP is used.
 */
export function checkAndWarnInsecureServerUrl(rawUrl: string): boolean {
  const check = validateServerUrl(rawUrl);
  if (check.isValid && !check.isSecure && check.warning) {
    vscode.window.showWarningMessage(
      `⚠️ CollabIntel Security Warning: ${check.warning}`,
      'Learn More'
    );
    return false;
  }
  return check.isValid;
}

/**
 * Sanitize a file path:
 *  - Strips absolute path prefix if within workspaceRoot
 *  - Strips generic Windows/Unix root patterns (e.g. C:/Users/.../workspace/)
 *  - Normalizes backslashes to forward slashes
 */
export function sanitizeFilePath(filePath: string, workspaceRoot?: string): string {
  if (!filePath || typeof filePath !== 'string') return '';

  let normalized = filePath.replace(/\\/g, '/');

  if (workspaceRoot) {
    const normRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '');
    if (normalized.toLowerCase().startsWith(normRoot.toLowerCase())) {
      normalized = normalized.slice(normRoot.length).replace(/^\/+/, '');
    }
  }

  // Remove common absolute root prefixes if still present
  // Windows: e.g. "C:/.../" or "F:/.../something/"
  normalized = normalized.replace(/^[a-zA-Z]:\/(?:Users|home|workspace|var|tmp)\/[^/]+\/[^/]+\//i, '');
  // Unix: e.g. "/Users/.../" or "/home/.../"
  normalized = normalized.replace(/^\/(?:Users|home|workspace|var|tmp)\/[^/]+\/[^/]+\//i, '');
  // Any leftover drive letter prefix (e.g. "C:/")
  normalized = normalized.replace(/^[a-zA-Z]:\//, '');
  // Leftover leading slash
  normalized = normalized.replace(/^\/+/, '');

  return normalized;
}

/**
 * Deeply sanitize an arbitrary payload object or array before synchronization.
 * Recursively converts absolute paths to relative paths and normalizes separators.
 */
export function sanitizePayload<T>(payload: T, workspaceRoot?: string): T {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    // If it looks like a path or contains a path
    if (/^[a-zA-Z]:[\\/]/.test(payload) || /^\/(?:Users|home|var|tmp)[\\/]/.test(payload)) {
      return sanitizeFilePath(payload, workspaceRoot) as unknown as T;
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item, workspaceRoot)) as unknown as T;
  }

  if (typeof payload === 'object') {
    const result: any = {};
    for (const [key, val] of Object.entries(payload)) {
      if (key === 'file_path' || key === 'filePath' || key === 'path' || key === 'file') {
        result[key] = typeof val === 'string' ? sanitizeFilePath(val, workspaceRoot) : val;
      } else if (key === 'filesList' && Array.isArray(val)) {
        result[key] = val.map(f => typeof f === 'string' ? sanitizeFilePath(f, workspaceRoot) : f);
      } else if (key === 'payload_json' && typeof val === 'string') {
        // Try parsing payload_json to sanitize nested paths, then re-stringify
        try {
          const parsed = JSON.parse(val);
          result[key] = JSON.stringify(sanitizePayload(parsed, workspaceRoot));
        } catch {
          result[key] = val;
        }
      } else {
        result[key] = sanitizePayload(val, workspaceRoot);
      }
    }
    return result as T;
  }

  return payload;
}

/**
 * Anonymize a raw student ID or email using SHA-256 hashing.
 */
export function anonymizeStudentId(rawId: string, salt: string = 'collabintel-salt'): string {
  if (!rawId || typeof rawId !== 'string') return 'anonymous_student';
  const hash = crypto.createHash('sha256').update(`${salt}:${rawId.trim().toLowerCase()}`).digest('hex');
  return `std_${hash.substring(0, 16)}`;
}

/**
 * Verify whether a student ID is properly anonymized or still contains raw PII (like email address).
 */
export function verifyStudentIdAnonymization(studentId: string): {
  isAnonymized: boolean;
  sanitizedId: string;
  reason?: string;
} {
  if (!studentId || typeof studentId !== 'string') {
    return { isAnonymized: false, sanitizedId: anonymizeStudentId('unknown'), reason: 'Empty student ID' };
  }

  const trimmed = studentId.trim();

  // Check for email PII
  if (trimmed.includes('@')) {
    return {
      isAnonymized: false,
      sanitizedId: anonymizeStudentId(trimmed),
      reason: 'Student ID contains email address (PII)'
    };
  }

  // Check for full name or spaces
  if (/\s/.test(trimmed)) {
    return {
      isAnonymized: false,
      sanitizedId: anonymizeStudentId(trimmed),
      reason: 'Student ID contains spaces or personal name format'
    };
  }

  // Check if it already matches standard anonymized formats:
  // e.g. "std_...", UUID format, or 16-64 character hex string
  const isHashFormat =
    /^std_[a-f0-9]{16,64}$/i.test(trimmed) ||
    /^[a-f0-9]{32,64}$/i.test(trimmed) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  if (isHashFormat) {
    return { isAnonymized: true, sanitizedId: trimmed };
  }

  // If it's a generic alphanumeric ID without PII (e.g. "student123", "ASSIGNMENT_1"), it's acceptable,
  // but we provide the hash if strict anonymization is desired.
  return {
    isAnonymized: true,
    sanitizedId: trimmed
  };
}
