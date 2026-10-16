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
export declare function validateServerUrl(rawUrl: string): ServerUrlValidationResult;
/**
 * Check server URL and prompt user with VS Code warning notification if insecure HTTP is used.
 */
export declare function checkAndWarnInsecureServerUrl(rawUrl: string): boolean;
/**
 * Sanitize a file path:
 *  - Strips absolute path prefix if within workspaceRoot
 *  - Strips generic Windows/Unix root patterns (e.g. C:/Users/.../workspace/)
 *  - Normalizes backslashes to forward slashes
 */
export declare function sanitizeFilePath(filePath: string, workspaceRoot?: string): string;
/**
 * Deeply sanitize an arbitrary payload object or array before synchronization.
 * Recursively converts absolute paths to relative paths and normalizes separators.
 */
export declare function sanitizePayload<T>(payload: T, workspaceRoot?: string): T;
/**
 * Anonymize a raw student ID or email using SHA-256 hashing.
 */
export declare function anonymizeStudentId(rawId: string, salt?: string): string;
/**
 * Verify whether a student ID is properly anonymized or still contains raw PII (like email address).
 */
export declare function verifyStudentIdAnonymization(studentId: string): {
    isAnonymized: boolean;
    sanitizedId: string;
    reason?: string;
};
