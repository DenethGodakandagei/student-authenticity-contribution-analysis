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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseSizeBytes = exports.closeDatabase = exports.getDatabase = exports.initDatabase = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
// ─────────────────────────────────────────────────────────────────────────────
//  SQLITE DATABASE INITIALIZATION & SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
let db = null;
/**
 * Initialize the SQLite database.
 * - Creates the database file in VS Code's globalStorageUri
 * - Configures WAL mode for crash resilience and concurrent reads
 * - Creates the telemetry_events table with full schema
 *
 * @param globalStoragePath Path from context.globalStorageUri.fsPath
 */
function initDatabase(globalStoragePath) {
    // Ensure storage directory exists
    if (!fs.existsSync(globalStoragePath)) {
        fs.mkdirSync(globalStoragePath, { recursive: true });
    }
    const dbPath = path.join(globalStoragePath, 'collabintel_telemetry.db');
    console.log(`[CollabIntel] Opening SQLite database at: ${dbPath}`);
    db = new better_sqlite3_1.default(dbPath);
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
exports.initDatabase = initDatabase;
/**
 * Run schema migrations for backward compatibility.
 */
function runMigrations(_db) {
    // Migration 1: Create schema_version table if it doesn't exist
    _db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
    const currentVersion = _db.prepare('SELECT MAX(version) as v FROM schema_version').get();
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
function getDatabase() {
    if (!db) {
        throw new Error('[CollabIntel] Database not initialized. Call initDatabase() first.');
    }
    return db;
}
exports.getDatabase = getDatabase;
/**
 * Close the database connection gracefully.
 */
function closeDatabase() {
    if (db) {
        try {
            // Optimize before closing (merge WAL)
            db.pragma('wal_checkpoint(TRUNCATE)');
            db.close();
            console.log('[CollabIntel] SQLite database closed.');
        }
        catch (err) {
            console.error('[CollabIntel] Error closing database:', err);
        }
        db = null;
    }
}
exports.closeDatabase = closeDatabase;
/**
 * Get the file size of the database in bytes (for audit viewer).
 */
function getDatabaseSizeBytes(globalStoragePath) {
    try {
        const dbPath = path.join(globalStoragePath, 'collabintel_telemetry.db');
        const walPath = dbPath + '-wal';
        let size = 0;
        if (fs.existsSync(dbPath))
            size += fs.statSync(dbPath).size;
        if (fs.existsSync(walPath))
            size += fs.statSync(walPath).size;
        return size;
    }
    catch {
        return 0;
    }
}
exports.getDatabaseSizeBytes = getDatabaseSizeBytes;
//# sourceMappingURL=database.js.map