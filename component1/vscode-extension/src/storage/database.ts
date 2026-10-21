import * as path from 'path';
import * as fs from 'fs';

let BetterSqlite3: any = null;
try {
  BetterSqlite3 = require('better-sqlite3');
} catch {
  // Native better-sqlite3 not available in current environment; fallback gracefully
}

// ─────────────────────────────────────────────────────────────────────────────
//  IN-MEMORY RESILIENT DATABASE FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

function createMemoryDatabase(): any {
  const events: any[] = [];
  let schemaVersion = 1;

  return {
    pragma: (_str: string) => undefined,
    exec: (_sql: string) => undefined,
    prepare: (sql: string) => {
      const lower = sql.toLowerCase();
      return {
        run: (...params: any[]) => {
          if (lower.includes('insert into telemetry_events')) {
            const row = params[0] || {};
            events.push({ ...row });
            if (events.length > 5000) events.shift();
            return { changes: 1, lastInsertRowid: events.length };
          }
          if (lower.includes('insert into schema_version')) {
            schemaVersion = params[0] || 1;
            return { changes: 1, lastInsertRowid: 1 };
          }
          if (lower.includes('update telemetry_events set sync_status = 1')) {
            const uuids = Array.isArray(params[0]) ? params[0] : params;
            for (const ev of events) {
              if (uuids.includes(ev.event_uuid)) {
                ev.sync_status = 1;
              }
            }
            return { changes: 1 };
          }
          if (lower.includes('update telemetry_events set sync_status = 0')) {
            for (const ev of events) {
              ev.sync_status = 0;
            }
            return { changes: 1 };
          }
          if (lower.includes('delete from telemetry_events')) {
            return { changes: 0 };
          }
          return { changes: 1, lastInsertRowid: 1 };
        },
        get: (...params: any[]) => {
          if (lower.includes('max(version)')) {
            return { v: schemaVersion };
          }
          if (lower.includes('row_hash')) {
            const last = events[events.length - 1];
            return last ? { row_hash: last.row_hash } : undefined;
          }
          if (lower.includes('count(*) as count') || lower.includes('count(*) as c')) {
            if (lower.includes('sync_status = 0')) {
              const unsynced = events.filter(e => e.sync_status === 0).length;
              return { c: unsynced, count: unsynced };
            }
            if (lower.includes('sync_status = 1')) {
              const synced = events.filter(e => e.sync_status === 1).length;
              return { c: synced, count: synced };
            }
            return { c: events.length, count: events.length };
          }
          if (lower.includes('min(timestamp)')) {
            const pending = events.filter(e => e.sync_status === 0);
            return { ts: pending.length > 0 ? (pending[0].timestamp || Date.now()) : null };
          }
          if (lower.includes('max(timestamp)')) {
            const pending = events.filter(e => e.sync_status === 0);
            return { ts: pending.length > 0 ? (pending[pending.length - 1].timestamp || Date.now()) : null };
          }
          if (lower.includes('count(*)')) {
            const unsynced = events.filter(e => e.sync_status === 0).length;
            return {
              c: events.length,
              total: events.length,
              unsynced,
              synced: events.length - unsynced,
              oldest: events[0]?.created_at || null,
              newest: events[events.length - 1]?.created_at || null
            };
          }
          return undefined;
        },
        all: (...params: any[]) => {
          const limit = typeof params[0] === 'number' ? params[0] : 100;
          if (lower.includes('where sync_status = 0')) {
            return events.filter(e => e.sync_status === 0).slice(0, limit);
          }
          if (lower.includes('order by timestamp desc')) {
            return [...events].reverse().slice(0, limit);
          }
          if (lower.includes('order by rowid asc')) {
            return events.map(e => ({
              previous_hash: e.previous_hash,
              row_hash: e.row_hash,
              timestamp: e.timestamp,
              payload_json: e.payload_json
            }));
          }
          return events.slice(0, limit);
        }
      };
    },
    close: () => {
      events.length = 0;
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SQLITE DATABASE INITIALIZATION & SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

let db: any = null;

/**
 * Initialize the SQLite database.
 * - Creates the database file in VS Code's globalStorageUri if better-sqlite3 is available
 * - Configures WAL mode for crash resilience and concurrent reads
 * - Creates the telemetry_events table with full schema
 * - Seamlessly falls back to memory database if native SQLite is unavailable
 * 
 * @param globalStoragePath Path from context.globalStorageUri.fsPath
 */
export function initDatabase(globalStoragePath: string): any {
  if (BetterSqlite3) {
    try {
      // Ensure storage directory exists
      if (!fs.existsSync(globalStoragePath)) {
        fs.mkdirSync(globalStoragePath, { recursive: true });
      }

      const dbPath = path.join(globalStoragePath, 'collabintel_telemetry.db');
      console.log(`[CollabIntel] Opening SQLite database at: ${dbPath}`);

      db = new BetterSqlite3(dbPath);

      // Performance Pragmas
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = -8000'); // 8MB cache
      db.pragma('foreign_keys = ON');

      // Schema Creation
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

      runMigrations(db);

      console.log('[CollabIntel] SQLite database initialized successfully.');
      return db;
    } catch (err) {
      console.warn('[CollabIntel] Native SQLite init failed, falling back to memory database:', err);
    }
  }

  console.log('[CollabIntel] Operating with fail-safe in-memory database store.');
  db = createMemoryDatabase();
  return db;
}

/**
 * Run schema migrations for backward compatibility.
 */
function runMigrations(_db: any): void {
  try {
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
      _db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);
    }
  } catch (err) {
    console.warn('[CollabIntel] Migration warning:', err);
  }
}

/**
 * Get the active database instance.
 * Always returns a working database instance, never throws.
 */
export function getDatabase(): any {
  if (!db) {
    db = createMemoryDatabase();
  }
  return db;
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    try {
      if (typeof db.pragma === 'function') {
        db.pragma('wal_checkpoint(TRUNCATE)');
      }
      if (typeof db.close === 'function') {
        db.close();
      }
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
