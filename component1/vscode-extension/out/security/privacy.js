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
exports.verifyStudentIdAnonymization = exports.anonymizeStudentId = exports.sanitizePayload = exports.sanitizeFilePath = exports.checkAndWarnInsecureServerUrl = exports.validateServerUrl = void 0;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
/**
 * Enforce HTTPS for production URLs.
 * Returns a warning if http:// is configured for a remote host (non-localhost).
 */
function validateServerUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return { isValid: false, isSecure: false, isLocal: false, error: 'Server URL is empty' };
    }
    const trimmed = rawUrl.trim();
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch (err) {
        return { isValid: false, isSecure: false, isLocal: false, error: `Invalid URL format: ${err.message}` };
    }
    const hostname = parsed.hostname.toLowerCase();
    const isLocal = hostname === 'localhost' ||
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
exports.validateServerUrl = validateServerUrl;
/**
 * Check server URL and prompt user with VS Code warning notification if insecure HTTP is used.
 */
function checkAndWarnInsecureServerUrl(rawUrl) {
    const check = validateServerUrl(rawUrl);
    if (check.isValid && !check.isSecure && check.warning) {
        vscode.window.showWarningMessage(`⚠️ CollabIntel Security Warning: ${check.warning}`, 'Learn More');
        return false;
    }
    return check.isValid;
}
exports.checkAndWarnInsecureServerUrl = checkAndWarnInsecureServerUrl;
/**
 * Sanitize a file path:
 *  - Strips absolute path prefix if within workspaceRoot
 *  - Strips generic Windows/Unix root patterns (e.g. C:/Users/.../workspace/)
 *  - Normalizes backslashes to forward slashes
 */
function sanitizeFilePath(filePath, workspaceRoot) {
    if (!filePath || typeof filePath !== 'string')
        return '';
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
exports.sanitizeFilePath = sanitizeFilePath;
/**
 * Deeply sanitize an arbitrary payload object or array before synchronization.
 * Recursively converts absolute paths to relative paths and normalizes separators.
 */
function sanitizePayload(payload, workspaceRoot) {
    if (payload === null || payload === undefined) {
        return payload;
    }
    if (typeof payload === 'string') {
        // If it looks like a path or contains a path
        if (/^[a-zA-Z]:[\\/]/.test(payload) || /^\/(?:Users|home|var|tmp)[\\/]/.test(payload)) {
            return sanitizeFilePath(payload, workspaceRoot);
        }
        return payload;
    }
    if (Array.isArray(payload)) {
        return payload.map(item => sanitizePayload(item, workspaceRoot));
    }
    if (typeof payload === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(payload)) {
            if (key === 'file_path' || key === 'filePath' || key === 'path' || key === 'file') {
                result[key] = typeof val === 'string' ? sanitizeFilePath(val, workspaceRoot) : val;
            }
            else if (key === 'filesList' && Array.isArray(val)) {
                result[key] = val.map(f => typeof f === 'string' ? sanitizeFilePath(f, workspaceRoot) : f);
            }
            else if (key === 'payload_json' && typeof val === 'string') {
                // Try parsing payload_json to sanitize nested paths, then re-stringify
                try {
                    const parsed = JSON.parse(val);
                    result[key] = JSON.stringify(sanitizePayload(parsed, workspaceRoot));
                }
                catch {
                    result[key] = val;
                }
            }
            else {
                result[key] = sanitizePayload(val, workspaceRoot);
            }
        }
        return result;
    }
    return payload;
}
exports.sanitizePayload = sanitizePayload;
/**
 * Anonymize a raw student ID or email using SHA-256 hashing.
 */
function anonymizeStudentId(rawId, salt = 'collabintel-salt') {
    if (!rawId || typeof rawId !== 'string')
        return 'anonymous_student';
    const hash = crypto.createHash('sha256').update(`${salt}:${rawId.trim().toLowerCase()}`).digest('hex');
    return `std_${hash.substring(0, 16)}`;
}
exports.anonymizeStudentId = anonymizeStudentId;
/**
 * Verify whether a student ID is properly anonymized or still contains raw PII (like email address).
 */
function verifyStudentIdAnonymization(studentId) {
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
    const isHashFormat = /^std_[a-f0-9]{16,64}$/i.test(trimmed) ||
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
exports.verifyStudentIdAnonymization = verifyStudentIdAnonymization;
//# sourceMappingURL=privacy.js.map