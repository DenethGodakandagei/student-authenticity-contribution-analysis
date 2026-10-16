import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

// ─────────────────────────────────────────────────────────────────────────────
//  SQLITE DATABASE INITIALIZATION & SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database.
 * - Creates the database file in VS Code's globalStorageUri
 * - Configures WAL mode for crash resilience and concurrent reads
 * - Creates the telemetry_events table with full schema
 * 
 * @param globalStoragePath Path from context.globalStorageUri.fsPath
 */
export function initDatabase(globalStoragePath: string): Database.Database {
  // Ensure storage directory exists
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
  }

  const dbPath = path.join(globalStoragePath, 'collabintel_telemetry.db');
  console.log(`[CollabIntel] Opening SQLite database at: ${dbPath}`);

  db = new Database(dbPath);

  // ── Performance Pragmas ──────────────────────────────────────────────
  // WAL mode: allows concurrent reads while writing, crash-safe
  db.pragma('journal_mode = WAL');
  // NORMAL sync: balances safety and speed (WAL provides the safety net)
  db.pragma('synchronous = NORMAL');
  // Increase cache for better read performance
  db.pragma('cache_size = -8000'); // 8MB cache
  // Enable foreign keys (for future schema extensions)
  db.pragma('foreign_keys = ON');

  // ── Schema Creation ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      event_uuid      TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      student_id      TEXT NOT NULL,
      task_id         TEXT,
      repo_id         TEXT,
      branch          TEXT,
      commit_sha      TEXT,
      event_type      TEXT NOT NULL,
      category        TEXT NOT NULL,
      file_path       TEXT,
      timestamp       INTEGER NOT NULL,
      payload_json    TEXT NOT NULL,
      sync_status     INTEGER DEFAULT 0,
      previous_hash   TEXT,
      row_hash        TEXT NOT NULL,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sync_status ON telemetry_events(sync_status);
    CREATE INDEX IF NOT EXISTS idx_timestamp   ON telemetry_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_session     ON telemetry_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_event_type  ON telemetry_events(event_type);
  `);

  // ── Schema Migration: Add columns if upgrading from older version ────
  runMigrations(db);

  console.log('[CollabIntel] SQLite database initialized successfully.');
  return db;
}

/**
 * Run schema migrations for backward compatibility.
 */
function runMigrations(_db: Database.Database): void {
  // Migration 1: Create schema_version table if it doesn't exist
  _db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const currentVersion = _db.prepare(
    'SELECT MAX(version) as v FROM schema_version'
  ).get() as { v: number | null } | undefined;

  const version = currentVersion?.v || 0;

  if (version < 1) {
    // Version 1: Initial schema (already created above)
    _db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);
  }

  // Future migrations go here:
  // if (version < 2) { ... _db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(2); }
}

/**
 * Get the active database instance.
 * @throws if database has not been initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('[CollabIntel] Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    try {
      // Optimize before closing (merge WAL)
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('[CollabIntel] SQLite database closed.');
    } catch (err) {
      console.error('[CollabIntel] Error closing database:', err);
    }
    db = null;
  }
}

/**
 * Get the file size of the database in bytes (for audit viewer).
 */
export function getDatabaseSizeBytes(globalStoragePath: string): number {
  try {
    const dbPath = path.join(globalStoragePath, 'collabintel_telemetry.db');
    const walPath = dbPath + '-wal';
    let size = 0;
    if (fs.existsSync(dbPath)) size += fs.statSync(dbPath).size;
    if (fs.existsSync(walPath)) size += fs.statSync(walPath).size;
    return size;
  } catch {
    return 0;
  }
}
