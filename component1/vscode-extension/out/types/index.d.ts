export type EventType = 'KEYSTROKE' | 'PASTE_BURST' | 'SAVE' | 'FILE_OPEN' | 'FILE_CREATE' | 'FILE_DELETE' | 'BACKGROUND_MUTATION' | 'FOCUS' | 'BLUR' | 'TAB_SWITCH' | 'IDLE' | 'ACTIVE_RESUME' | 'DIAGNOSTIC' | 'DIAGNOSTIC_RESOLVED' | 'GIT_COMMIT';
export type EventCategory = 'SOURCE_CODE_EDIT' | 'CONFIG_EDIT' | 'SYSTEM';
export interface DiagnosticEntry {
    /** Unique key: filePath + errorCode + range */
    key: string;
    filePath: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    code: string | number | undefined;
    message: string;
    appearedAt: number;
    resolvedAt?: number;
    source?: string;
}
export interface DiagnosticSummary {
    currentErrorCount: number;
    currentWarningCount: number;
    totalErrorsSeen: number;
    totalWarningsSeen: number;
    resolvedErrors: number;
    avgResolutionMs: number;
    activeErrors: DiagnosticEntry[];
}
export interface FocusSummary {
    focusTransitions: number;
    tabSwitches: number;
    isFocused: boolean;
    lastFocusTime: number;
    lastBlurTime: number;
}
export type IdleState = 'ACTIVE' | 'IDLE';
export interface IdleSummary {
    state: IdleState;
    activeCodingSeconds: number;
    idleSeconds: number;
    activeTypingSeconds: number;
    lastStateChange: number;
}
export interface PasteBurstDetail {
    charCount: number;
    lineCountDelta: number;
    textPreview: string;
    timestamp: string;
}
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
    category: EventCategory;
    manualChars: number;
    pasteChars: number;
    aiChars: number;
    manualKeystrokes: number;
    pasteEvents: number;
    aiEvents: number;
    typingProvenance: 'manual' | 'ai_assisted' | 'copy_paste' | 'mixed';
    linesAdded: number;
    linesRemoved: number;
    netInsertedChars: number;
    netDeletedChars: number;
    saveCount: number;
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
/** Represents a single telemetry event stored in the SQLite database. */
export interface TelemetryEvent {
    event_uuid: string;
    session_id: string;
    student_id: string;
    task_id: string;
    repo_id: string;
    branch: string;
    commit_sha: string;
    event_type: EventType;
    category: EventCategory;
    file_path: string;
    timestamp: number;
    payload_json: string;
    sync_status: number;
    previous_hash: string;
    row_hash: string;
    created_at: string;
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
export interface WindowFeatures {
    windowStart: number;
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
    matchScore: number;
    matchMethod: 'exact_hash' | 'temporal_proximity' | 'file_signature' | 'unmatched';
    isSquashedOrRebased: boolean;
}
