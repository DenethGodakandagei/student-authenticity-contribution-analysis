// ─────────────────────────────────────────────────────────────────────────────
//  TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

// ── Event Type Enum (Plan 2: Sensor Layer) ───────────────────────────────────
export type EventType =
  | 'KEYSTROKE'
  | 'PASTE_BURST'
  | 'SAVE'
  | 'FILE_OPEN'
  | 'FILE_CREATE'
  | 'FILE_DELETE'
  | 'BACKGROUND_MUTATION'
  | 'FOCUS'
  | 'BLUR'
  | 'TAB_SWITCH'
  | 'IDLE'
  | 'ACTIVE_RESUME'
  | 'DIAGNOSTIC'
  | 'DIAGNOSTIC_RESOLVED'
  | 'GIT_COMMIT';

// ── Event Category (Plan 2: Noise Filter) ────────────────────────────────────
export type EventCategory = 'SOURCE_CODE_EDIT' | 'CONFIG_EDIT' | 'SYSTEM';

// ── Diagnostic Snapshot ──────────────────────────────────────────────────────
export interface DiagnosticEntry {
  /** Unique key: filePath + errorCode + range */
  key: string;
  filePath: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  code: string | number | undefined;
  message: string;
  appearedAt: number;      // Unix epoch ms
  resolvedAt?: number;     // Unix epoch ms (set when resolved)
  source?: string;         // e.g. 'typescript', 'eslint'
}

export interface DiagnosticSummary {
  currentErrorCount: number;
  currentWarningCount: number;
  totalErrorsSeen: number;
  totalWarningsSeen: number;
  resolvedErrors: number;
  avgResolutionMs: number;        // average time to resolve errors
  activeErrors: DiagnosticEntry[];
}

// ── Focus / Window State ─────────────────────────────────────────────────────
export interface FocusSummary {
  focusTransitions: number;       // total blur→focus cycles
  tabSwitches: number;            // active editor switches
  isFocused: boolean;             // current window state
  lastFocusTime: number;          // epoch ms of last focus event
  lastBlurTime: number;           // epoch ms of last blur event
}

// ── Idle State Machine ───────────────────────────────────────────────────────
export type IdleState = 'ACTIVE' | 'IDLE';

export interface IdleSummary {
  state: IdleState;
  activeCodingSeconds: number;    // cumulative active time this session
  idleSeconds: number;            // cumulative idle time this session
  activeTypingSeconds: number;    // cumulative keystroke-active time
  lastStateChange: number;        // epoch ms of last state transition
}

// ── Paste Burst Detail ───────────────────────────────────────────────────────
export interface PasteBurstDetail {
  charCount: number;
  lineCountDelta: number;
  textPreview: string;            // first 100 chars truncated
  timestamp: string;
}

// ── Existing Types (unchanged from Plan 1) ───────────────────────────────────

export interface LineProvenanceRecord {
  lineNumber: number;
  lineText?: string;
  provenance: 'manual' | 'ai_assisted' | 'copy_paste';
  isOffline: boolean;
  timestamp: string;
}

export interface FileActivityItem {
  filePath: string;
  action: 'created' | 'edited' | 'deleted';
  category: EventCategory;       // NEW: source code vs config vs system
  manualChars: number;
  pasteChars: number;
  aiChars: number;
  manualKeystrokes: number;
  pasteEvents: number;
  aiEvents: number;
  typingProvenance: 'manual' | 'ai_assisted' | 'copy_paste' | 'mixed';
  linesAdded: number;
  linesRemoved: number;
  netInsertedChars: number;       // NEW: total chars inserted
  netDeletedChars: number;        // NEW: total chars deleted
  saveCount: number;              // NEW: explicit save count
  isOffline?: boolean;
  lineRecords?: LineProvenanceRecord[];
  timestamp?: string;
}

export interface CodingProvenanceItem {
  manualPercent: number;
  pastePercent: number;
  aiPercent: number;
  style: string;
}

export interface SessionPayload {
  sessionStart: string;
  sessionEnd: string;
  durationMinutes: number;
  keystrokes: number;
  linesAdded: number;
  linesRemoved: number;
  filesEdited: string[];
  filesCreated: string[];
  filesDeleted: string[];
  foldersCreated?: string[];
  foldersDeleted?: string[];
  activeFolders?: string[];
  fileActivities?: FileActivityItem[];
  codingProvenance?: CodingProvenanceItem;
  localCommits: LocalCommit[];
  repoRemoteUrl: string;
  isOffline: boolean;
  pasteCount: number;
  charactersPasted: number;
  // ── Plan 2 additions ──
  saveCount?: number;
  fileOpenCount?: number;
  netInsertedChars?: number;
  netDeletedChars?: number;
  diagnosticSummary?: DiagnosticSummary;
  focusSummary?: FocusSummary;
  idleSummary?: IdleSummary;
  pasteBursts?: PasteBurstDetail[];
}

export interface LocalCommit {
  hash: string;
  message: string;
  date: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  author?: string;
  authorEmail?: string;
  branch?: string;
  isMerge?: boolean;
  filesList?: string[];
}

export interface ExtConfig {
  authToken: string;
  assignmentId: string;
  serverUrl: string;
  syncIntervalMinutes: number;
  trackOnlyLinkedRepo: boolean;
  operatingMode: 'real' | 'experimental';
}

export type StatusState = 'tracking' | 'idle' | 'syncing' | 'error' | 'unconfigured';

// ─────────────────────────────────────────────────────────────────────────────
//  TELEMETRY EVENT (SQLite Row Model — Plan 3)
// ─────────────────────────────────────────────────────────────────────────────

/** Represents a single telemetry event stored in the SQLite database. */
export interface TelemetryEvent {
  event_uuid: string;           // UUIDv4 primary key
  session_id: string;           // UUIDv4 grouping key for the coding session
  student_id: string;           // from auth token / config
  task_id: string;              // assignment ID
  repo_id: string;              // repo remote URL or identifier
  branch: string;               // current git branch
  commit_sha: string;           // HEAD commit hash at time of event
  event_type: EventType;        // KEYSTROKE | PASTE_BURST | SAVE | etc.
  category: EventCategory;      // SOURCE_CODE_EDIT | CONFIG_EDIT | SYSTEM
  file_path: string;            // relative path to workspace
  timestamp: number;            // Unix epoch ms
  payload_json: string;         // JSON string of delta metrics
  sync_status: number;          // 0 = Pending, 1 = Synced
  previous_hash: string;        // hash of previous row (chain link)
  row_hash: string;             // SHA-256(previous_hash + timestamp + payload_json)
  created_at: string;           // ISO 8601 datetime
}

/** Summary of the local event queue for audit/status display. */
export interface QueueStatus {
  totalEvents: number;
  pendingCount: number;
  syncedCount: number;
  oldestPendingTimestamp: number | null;
  newestPendingTimestamp: number | null;
  storageBytes: number;
  hashChainValid: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ML WINDOW FEATURES (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────

export interface WindowFeatures {
  windowStart: number;       // Unix epoch ms
  windowEnd: number;
  sessionId: string;
  features: {
    activeCodingTimeSec: number;
    idleTimeSec: number;
    sessionDurationSec: number;
    activeTypingDurationSec: number;
    keystrokeCount: number;
    pasteCount: number;
    pastedCharCount: number;
    pasteToKeystrokeRatio: number;
    typingVelocity: number;
    netInsertedChars: number;
    netDeletedChars: number;
    codeChurnRatio: number;
    fileModificationFreq: number;
    fileCreateDeleteCount: number;
    explicitSaveCount: number;
    syntaxErrorCount: number;
    errorResolutionDurationSec: number;
    windowFocusTransitions: number;
    gitOperationsCount: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPORAL RECONCILIATION TYPES (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────

export interface EditingSession {
  sessionId: string;
  startTime: number;
  endTime: number;
  durationSec: number;
  eventCount: number;
  filesModified: string[];
  netInsertedChars: number;
  netDeletedChars: number;
  keystrokeCount: number;
  pasteCount: number;
}

export interface ReconciledSession {
  session: EditingSession;
  matchedCommit?: LocalCommit;
  matchScore: number;           // 0.0 to 1.0 confidence
  matchMethod: 'exact_hash' | 'temporal_proximity' | 'file_signature' | 'unmatched';
  isSquashedOrRebased: boolean;
}
