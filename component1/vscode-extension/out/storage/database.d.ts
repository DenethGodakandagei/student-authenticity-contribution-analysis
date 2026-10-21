/**
 * Initialize the SQLite database.
 * - Creates the database file in VS Code's globalStorageUri if better-sqlite3 is available
 * - Configures WAL mode for crash resilience and concurrent reads
 * - Creates the telemetry_events table with full schema
 * - Seamlessly falls back to memory database if native SQLite is unavailable
 *
 * @param globalStoragePath Path from context.globalStorageUri.fsPath
 */
export declare function initDatabase(globalStoragePath: string): any;
/**
 * Get the active database instance.
 * Always returns a working database instance, never throws.
 */
export declare function getDatabase(): any;
/**
 * Close the database connection gracefully.
 */
export declare function closeDatabase(): void;
/**
 * Get the file size of the database in bytes (for audit viewer).
 */
export declare function getDatabaseSizeBytes(globalStoragePath: string): number;
