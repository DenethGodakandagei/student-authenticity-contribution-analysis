import Database from 'better-sqlite3';
/**
 * Initialize the SQLite database.
 * - Creates the database file in VS Code's globalStorageUri
 * - Configures WAL mode for crash resilience and concurrent reads
 * - Creates the telemetry_events table with full schema
 *
 * @param globalStoragePath Path from context.globalStorageUri.fsPath
 */
export declare function initDatabase(globalStoragePath: string): Database.Database;
/**
 * Get the active database instance.
 * @throws if database has not been initialized
 */
export declare function getDatabase(): Database.Database;
/**
 * Close the database connection gracefully.
 */
export declare function closeDatabase(): void;
/**
 * Get the file size of the database in bytes (for audit viewer).
 */
export declare function getDatabaseSizeBytes(globalStoragePath: string): number;
