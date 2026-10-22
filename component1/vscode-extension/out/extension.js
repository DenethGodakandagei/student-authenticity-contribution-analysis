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
exports.deactivate = exports.activate = exports.hasAiSignatures = exports.isMatchingClipboard = exports.refreshClipboardText = exports.addToClipboardHistory = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const settings_1 = require("./config/settings");
const http_client_1 = require("./utils/http-client");
const noise_filter_1 = require("./filters/noise-filter");
const git_client_1 = require("./git/git-client");
const reconciler_1 = require("./git/reconciler");
const status_bar_1 = require("./ui/status-bar");
const sidebar_provider_1 = require("./ui/sidebar-provider");
const dashboard_panel_1 = require("./ui/dashboard-panel");
// ─── Sensor Imports (Plan 2) ─────────────────────────────────────────────────
const diagnostic_sensor_1 = require("./sensors/diagnostic.sensor");
const focus_sensor_1 = require("./sensors/focus.sensor");
const idle_sensor_1 = require("./sensors/idle.sensor");
const document_sensor_1 = require("./sensors/document.sensor");
// ─── Storage Imports (Plan 3) ────────────────────────────────────────────────
const database_1 = require("./storage/database");
const event_store_1 = require("./storage/event-store");
const uuid_1 = require("./utils/uuid");
// ─── Sync Engine Imports (Plan 4) ────────────────────────────────────────────
const health_check_1 = require("./sync/health-check");
const batch_sync_1 = require("./sync/batch-sync");
// ─── ML Features & Sliding Window (Plan 5) ───────────────────────────────────
const sliding_window_1 = require("./features/sliding-window");
// ─── Line Provenance & Visual Highlighting ──────────────────────────────────
const line_provenance_tracker_1 = require("./features/line-provenance-tracker");
// ─── UI Polish, Audit Viewer, Performance & Privacy (Plan 6) ─────────────────
const audit_viewer_1 = require("./ui/audit-viewer");
const performance_1 = require("./utils/performance");
const privacy_1 = require("./security/privacy");
// ─── Volunteer Experiment & Offline Export (Phase 1) ─────────────────────────
const onboarding_1 = require("./ui/onboarding");
const export_bundle_1 = require("./ui/export-bundle");
// ─────────────────────────────────────────────────────────────────────────────
//  SESSION & EXTENSION GLOBAL STATE
// ─────────────────────────────────────────────────────────────────────────────
let extensionContext;
let sessionStart = null;
let lastActivityTime = Date.now();
let keystrokeCount = 0;
let linesAddedCount = 0;
let linesRemovedCount = 0;
let pasteCount = 0;
let charactersPasted = 0;
let aiCharsCount = 0;
let aiEventsCount = 0;
let manualCharsCount = 0;
let netInsertedChars = 0;
let netDeletedChars = 0;
const editedFiles = new Set();
const createdFiles = new Set();
const deletedFiles = new Set();
const createdFolders = new Set();
const deletedFolders = new Set();
const fileActivityMap = new Map();
let cachedCommitsThisSession = [];
const pasteBursts = [];
let syncTimer = null;
let lastSyncedCommitHash = '';
// ─── Plan 3: Session & Event Storage State ───────────────────────────────────
let currentSessionId = (0, uuid_1.generateUUID)();
let currentBranch = '';
let currentCommitSha = '';
let currentRepoId = '';
let dbInitialized = false;
let globalStoragePath = '';
let sidebarProviderInstance = null;
// ─── Sensor Instances (Plan 2) ───────────────────────────────────────────────
const diagnosticSensor = new diagnostic_sensor_1.DiagnosticSensor();
const focusSensor = new focus_sensor_1.FocusSensor();
const idleSensor = new idle_sensor_1.IdleSensor();
const documentSensor = new document_sensor_1.DocumentSensor();
// ─── Clipboard History & Pre-caching ─────────────────────────────────────────
let lastReadClipboardText = '';
let lastClipboardReadTime = 0;
const recentClipboardHistory = [];
const MAX_CLIPBOARD_HISTORY = 15;
function addToClipboardHistory(text) {
    if (!text || text.trim().length === 0)
        return;
    const norm = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (norm.length === 0)
        return;
    if (recentClipboardHistory[0] === norm)
        return;
    const idx = recentClipboardHistory.indexOf(norm);
    if (idx >= 0) {
        recentClipboardHistory.splice(idx, 1);
    }
    recentClipboardHistory.unshift(norm);
    if (recentClipboardHistory.length > MAX_CLIPBOARD_HISTORY) {
        recentClipboardHistory.pop();
    }
}
exports.addToClipboardHistory = addToClipboardHistory;
async function refreshClipboardText() {
    const now = Date.now();
    if (now - lastClipboardReadTime < 300) {
        return lastReadClipboardText;
    }
    try {
        const text = await vscode.env.clipboard.readText();
        lastReadClipboardText = text || '';
        lastClipboardReadTime = now;
        if (lastReadClipboardText) {
            addToClipboardHistory(lastReadClipboardText);
        }
    }
    catch {
        // Win32 clipboard locked - retain cached value
    }
    return lastReadClipboardText;
}
exports.refreshClipboardText = refreshClipboardText;
function isMatchingClipboard(insertedText, currentClip) {
    if (!insertedText || insertedText.length === 0)
        return false;
    const normEndings = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const stripWs = (s) => s.replace(/\s+/g, '');
    const textNorm = normEndings(insertedText);
    const textTrimmed = textNorm.trim();
    if (textTrimmed.length === 0)
        return false;
    const textWs = stripWs(textNorm);
    const candidates = [currentClip, ...recentClipboardHistory].filter(Boolean);
    for (const candidate of candidates) {
        const clipNorm = normEndings(candidate);
        const clipTrimmed = clipNorm.trim();
        if (clipTrimmed.length === 0)
            continue;
        // Direct matches
        if (textNorm === clipNorm || textTrimmed === clipTrimmed)
            return true;
        if (clipNorm.startsWith(textNorm) || clipTrimmed.startsWith(textTrimmed))
            return true;
        if (clipTrimmed.endsWith(textTrimmed))
            return true;
        // Substring matches for partial pastes or selection pastes
        if (textTrimmed.length >= 4 && clipTrimmed.includes(textTrimmed))
            return true;
        if (clipTrimmed.length >= 4 && textTrimmed.includes(clipTrimmed))
            return true;
        // Whitespace-agnostic match (auto-indentation by VS Code on paste)
        const clipWs = stripWs(clipNorm);
        if (clipWs.length >= 4 && textWs.length >= 4) {
            if (clipWs === textWs || clipWs.includes(textWs) || textWs.includes(clipWs)) {
                return true;
            }
        }
        // Line-by-line overlap comparison for multiline pastes
        const clipLines = clipNorm.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
        const textLines = textNorm.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
        if (clipLines.length > 0 && textLines.length > 0) {
            const matchCount = textLines.filter(tl => clipLines.some(cl => cl === tl || cl.includes(tl) || tl.includes(cl))).length;
            if (matchCount >= 2 || (textLines.length === 1 && matchCount === 1 && textTrimmed.length >= 6)) {
                return true;
            }
        }
    }
    return false;
}
exports.isMatchingClipboard = isMatchingClipboard;
function hasAiSignatures(text) {
    return (/\/\/\s*(here('?s| is)|generated (by|with)|auto-?generated|ai[- ]assistant|copilot|chatgpt|claude|gemini|openai|step \d+:|helper function to|implementation of|prompt:|solution:)/i.test(text) ||
        /\/\*\s*(auto-?generated|generated by ai|ai assistant|solution provided by|copilot)/i.test(text) ||
        /```(?:js|javascript|ts|typescript|python|py|html|css|json)?/i.test(text) ||
        /^(?:Certainly!|Sure!|Here is|Below is the code|This function|I have created|Hope this helps)/im.test(text));
}
exports.hasAiSignatures = hasAiSignatures;
// ─────────────────────────────────────────────────────────────────────────────
//  PROVENANCE & TELEMETRY SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────
function computeLiveProvenance() {
    const manual = manualCharsCount > 0 ? manualCharsCount : keystrokeCount;
    const paste = charactersPasted;
    const ai = aiCharsCount;
    const total = manual + paste + ai;
    let manualPercent = 100;
    let pastePercent = 0;
    let aiPercent = 0;
    if (total > 0) {
        manualPercent = Math.round((manual / total) * 100);
        pastePercent = Math.round((paste / total) * 100);
        aiPercent = Math.max(0, 100 - manualPercent - pastePercent);
    }
    let style = 'Manual Typing';
    if (pastePercent > 50)
        style = 'Heavy Copy-Paste';
    else if (pastePercent > 15)
        style = 'Snippet / Reference Pastes';
    else if (aiPercent > 40)
        style = 'AI-Assisted Development';
    else if (aiPercent > 15)
        style = 'Balanced Copilot-Assisted';
    else if (manualPercent >= 80)
        style = 'Authentic Manual Typing';
    return { manualPercent, pastePercent, aiPercent, style };
}
function getTelemetrySnapshot() {
    const cfg = (0, settings_1.getConfig)();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const now = new Date();
    const durationMinutes = sessionStart ? Math.max(1, Math.round((now.getTime() - sessionStart.getTime()) / 60000)) : 0;
    const offlineSessions = extensionContext?.globalState.get('offline_sessions') || [];
    const provenance = computeLiveProvenance();
    const fileActivities = Array.from(fileActivityMap.values());
    return {
        isConfigured: Boolean(cfg.authToken && cfg.assignmentId),
        isTracking: Boolean(sessionStart),
        sessionStart: sessionStart ? sessionStart.toISOString() : null,
        durationMinutes,
        keystrokes: keystrokeCount,
        linesAdded: linesAddedCount,
        linesRemoved: linesRemovedCount,
        pasteCount,
        charactersPasted,
        manualCharsCount,
        aiCharsCount,
        aiEventsCount,
        netInsertedChars,
        netDeletedChars,
        provenance,
        fileActivities,
        editedFilesCount: editedFiles.size,
        createdFilesCount: createdFiles.size,
        deletedFilesCount: deletedFiles.size,
        editedFilesList: Array.from(editedFiles),
        createdFilesList: Array.from(createdFiles),
        deletedFilesList: Array.from(deletedFiles),
        offlineCount: offlineSessions.length,
        lastSyncedHash: lastSyncedCommitHash,
        statusState: (0, status_bar_1.getStatusState)(),
        config: cfg,
        commits: cachedCommitsThisSession,
        workspaceRoot,
        operatingMode: cfg.operatingMode,
        experimentSession: cfg.operatingMode === 'experimental' ? (extensionContext ? (0, onboarding_1.getExperimentSession)(extensionContext) : null) : null,
        // ── Plan 2 sensor data ──
        saveCount: documentSensor.saveCount,
        fileOpenCount: documentSensor.fileOpenCount,
        diagnosticSummary: diagnosticSensor.getSummary(),
        focusSummary: focusSensor.getSummary(),
        idleSummary: idleSensor.getSummary(),
        pasteBurstCount: pasteBursts.length,
        // ── Plan 3 queue data ──
        queueStatus: dbInitialized ? (0, event_store_1.getQueueStatus)(globalStoragePath) : null,
        pendingEventCount: dbInitialized ? (0, event_store_1.getPendingCount)() : 0,
        sessionId: currentSessionId,
        // ── Plan 5 & 6 Sliding Window & Performance ──
        latestWindow: sliding_window_1.defaultSlidingWindowManager.getLatestWindow(),
        recentWindows: sliding_window_1.defaultSlidingWindowManager.getRecentWindows(),
        performance: (0, performance_1.getPerformanceStats)(),
        // ── Line Provenance & Visual Highlighting ──
        activeDocumentProvenance: line_provenance_tracker_1.defaultLineProvenanceTracker.getActiveSummary(),
        isProvenanceHighlightingEnabled: line_provenance_tracker_1.defaultLineProvenanceTracker.isHighlightingEnabled
    };
}
// ─────────────────────────────────────────────────────────────────────────────
//  WEBVIEW BROADCASTING
// ─────────────────────────────────────────────────────────────────────────────
function broadcastStateToWebviews() {
    const snapshot = getTelemetrySnapshot();
    if (sidebarProviderInstance) {
        sidebarProviderInstance.postMessage({ type: 'updateState', state: snapshot });
    }
    const dashPanel = (0, dashboard_panel_1.getActiveDashboardPanel)();
    if (dashPanel) {
        dashPanel.webview.postMessage({ type: 'updateState', state: snapshot });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
//  SESSION & GIT CONTEXT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function refreshGitContext(workspaceRoot) {
    if (!workspaceRoot)
        return;
    try {
        const [headHash, branch, repoUrl] = await Promise.all([
            (0, git_client_1.getCurrentHeadHash)(workspaceRoot),
            (0, git_client_1.getCurrentBranch)(workspaceRoot),
            (0, git_client_1.detectRepoRemoteUrl)(workspaceRoot)
        ]);
        if (headHash) {
            currentCommitSha = headHash;
            if (!lastSyncedCommitHash)
                lastSyncedCommitHash = headHash;
        }
        if (branch)
            currentBranch = branch;
        if (repoUrl)
            currentRepoId = repoUrl;
    }
    catch (err) {
        console.warn('[CollabIntel] Git context refresh notice:', err.message);
    }
}
function startSession(workspaceRoot) {
    sessionStart = new Date();
    currentSessionId = (0, uuid_1.generateUUID)(); // New session = new UUID
    keystrokeCount = 0;
    linesAddedCount = 0;
    linesRemovedCount = 0;
    pasteCount = 0;
    charactersPasted = 0;
    manualCharsCount = 0;
    aiCharsCount = 0;
    aiEventsCount = 0;
    netInsertedChars = 0;
    netDeletedChars = 0;
    editedFiles.clear();
    createdFiles.clear();
    deletedFiles.clear();
    createdFolders.clear();
    deletedFolders.clear();
    fileActivityMap.clear();
    cachedCommitsThisSession = [];
    pasteBursts.length = 0;
    lastActivityTime = Date.now();
    // Reset all sensors
    diagnosticSensor.reset();
    focusSensor.reset();
    idleSensor.reset();
    documentSensor.reset();
    // Update git context for event recording (Plan 5: branch, commit_sha, repo_id)
    refreshGitContext(workspaceRoot);
    const cfg = (0, settings_1.getConfig)();
    if (!cfg.authToken || !cfg.assignmentId) {
        (0, status_bar_1.updateStatusBar)('unconfigured', broadcastStateToWebviews);
    }
    else {
        (0, status_bar_1.updateStatusBar)('tracking', broadcastStateToWebviews);
    }
}
async function saveAndSyncSession(context) {
    if (!sessionStart) {
        await flushOfflineCache(context);
        return;
    }
    // Guard: Never create or send empty sessions when no actual typing, paste, or file edits took place
    if (keystrokeCount === 0 && charactersPasted === 0 && aiCharsCount === 0 && editedFiles.size === 0) {
        return;
    }
    const cfg = (0, settings_1.getConfig)();
    if (!cfg.authToken || !cfg.assignmentId) {
        (0, status_bar_1.updateStatusBar)('unconfigured', broadcastStateToWebviews);
        return;
    }
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const sessionEnd = new Date();
    const durationMinutes = Math.max(1, Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000));
    const result = workspaceRoot ? await (0, git_client_1.fetchLocalCommitsSince)(workspaceRoot, lastSyncedCommitHash) : { commits: [], latestHash: lastSyncedCommitHash };
    const newCommits = result.commits;
    if (result.latestHash)
        lastSyncedCommitHash = result.latestHash;
    cachedCommitsThisSession = newCommits;
    const repoRemoteUrl = workspaceRoot ? await (0, git_client_1.detectRepoRemoteUrl)(workspaceRoot) : '';
    const activeFolderSet = new Set();
    Array.from(editedFiles).concat(Array.from(createdFiles)).forEach(fp => {
        const dir = path.dirname(fp);
        if (dir && dir !== '.' && dir !== '/' && dir !== '\\') {
            activeFolderSet.add(dir.replace(/\\/g, '/'));
        }
    });
    // Synchronize exact per-line provenance tracked by defaultLineProvenanceTracker into fileActivity items
    for (const doc of vscode.workspace.textDocuments) {
        if (doc.uri.scheme !== 'file')
            continue;
        const rel = vscode.workspace.asRelativePath(doc.uri, false).replace(/\\/g, '/');
        const fileItem = fileActivityMap.get(rel);
        if (fileItem) {
            const trackerRecords = line_provenance_tracker_1.defaultLineProvenanceTracker.getLineRecordsForFile(doc);
            if (trackerRecords && trackerRecords.length > 0) {
                fileItem.lineRecords = trackerRecords;
            }
        }
    }
    const payload = {
        sessionStart: sessionStart.toISOString(),
        sessionEnd: sessionEnd.toISOString(),
        durationMinutes,
        keystrokes: keystrokeCount,
        linesAdded: linesAddedCount,
        linesRemoved: linesRemovedCount,
        filesEdited: Array.from(editedFiles),
        filesCreated: Array.from(createdFiles),
        filesDeleted: Array.from(deletedFiles),
        foldersCreated: Array.from(createdFolders),
        foldersDeleted: Array.from(deletedFolders),
        activeFolders: Array.from(activeFolderSet),
        fileActivities: Array.from(fileActivityMap.values()),
        codingProvenance: computeLiveProvenance(),
        localCommits: newCommits,
        repoRemoteUrl,
        isOffline: false,
        pasteCount,
        charactersPasted,
        manualChars: manualCharsCount,
        aiChars: aiCharsCount,
        aiEvents: aiEventsCount,
        // ── Plan 2 additions ──
        saveCount: documentSensor.saveCount,
        fileOpenCount: documentSensor.fileOpenCount,
        netInsertedChars,
        netDeletedChars,
        diagnosticSummary: diagnosticSensor.getSummary(),
        focusSummary: focusSensor.getSummary(),
        idleSummary: idleSensor.getSummary(),
        pasteBursts: pasteBursts.slice(0, 50) // cap at 50 most recent
    };
    (0, status_bar_1.updateStatusBar)('syncing', broadcastStateToWebviews);
    try {
        const url = `${cfg.serverUrl}/api/vscode/sync`;
        const result = await (0, http_client_1.postJson)(url, cfg.authToken, {
            sessions: payload,
            assignmentId: cfg.assignmentId
        });
        if (result.ok) {
            await flushOfflineCache(context);
            (0, status_bar_1.updateStatusBar)('tracking', broadcastStateToWebviews);
        }
        else {
            throw new Error(result.data?.error || `HTTP ${result.statusCode || 'Error'}`);
        }
    }
    catch (err) {
        payload.isOffline = true;
        const offline = context.globalState.get('offline_sessions') || [];
        offline.push(payload);
        context.globalState.update('offline_sessions', offline);
        (0, status_bar_1.updateStatusBar)('error', broadcastStateToWebviews);
    }
    startSession(workspaceRoot);
}
let autoSyncDebounceTimer = null;
function triggerDebouncedAutoSync(context, delayMs = 2500) {
    if (autoSyncDebounceTimer)
        clearTimeout(autoSyncDebounceTimer);
    autoSyncDebounceTimer = setTimeout(() => {
        if (sessionStart && (keystrokeCount > 0 || charactersPasted > 0 || aiCharsCount > 0 || editedFiles.size > 0)) {
            saveAndSyncSession(context);
        }
        if (dbInitialized && health_check_1.defaultHealthCheckMonitor.isOnline()) {
            (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
        }
    }, delayMs);
}
async function flushOfflineCache(context) {
    const cfg = (0, settings_1.getConfig)();
    if (!cfg.authToken || !cfg.assignmentId)
        return;
    const rawOffline = context.globalState.get('offline_sessions') || [];
    // Filter out any zero-activity sessions from the queue
    const offline = rawOffline.filter(s => (s.keystrokes || 0) > 0 || (s.charactersPasted || 0) > 0 || (s.aiChars || 0) > 0 || (s.filesEdited || []).length > 0);
    if (offline.length === 0) {
        if (rawOffline.length > 0)
            context.globalState.update('offline_sessions', []);
        return;
    }
    try {
        const url = `${cfg.serverUrl}/api/vscode/sync`;
        const result = await (0, http_client_1.postJson)(url, cfg.authToken, {
            sessions: offline,
            assignmentId: cfg.assignmentId
        });
        if (result.ok) {
            context.globalState.update('offline_sessions', []);
            broadcastStateToWebviews();
        }
    }
    catch {
        // leave cache
    }
}
// ─────────────────────────────────────────────────────────────────────────────
//  FILE ACTIVITY HELPER
// ─────────────────────────────────────────────────────────────────────────────
function getOrCreateFileActivity(relativePath, uri) {
    let fileItem = fileActivityMap.get(relativePath);
    if (!fileItem) {
        fileItem = {
            filePath: relativePath,
            action: createdFiles.has(relativePath) ? 'created' : 'edited',
            category: uri ? (0, noise_filter_1.categorizeFile)(uri) : 'SOURCE_CODE_EDIT',
            manualChars: 0,
            pasteChars: 0,
            aiChars: 0,
            manualKeystrokes: 0,
            pasteEvents: 0,
            aiEvents: 0,
            typingProvenance: 'manual',
            linesAdded: 0,
            linesRemoved: 0,
            netInsertedChars: 0,
            netDeletedChars: 0,
            saveCount: 0,
            timestamp: new Date().toISOString()
        };
        fileActivityMap.set(relativePath, fileItem);
    }
    return fileItem;
}
// ─────────────────────────────────────────────────────────────────────────────
//  EVENT STORAGE HELPER (Plan 3)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Store a telemetry event to SQLite with hash chain.
 * Silently skips if DB is not initialized.
 */
function storeEvent(eventType, category, filePath, payload) {
    if (!dbInitialized)
        return;
    (0, performance_1.profileHook)(`storeEvent:${eventType}`, () => {
        try {
            const cfg = (0, settings_1.getConfig)();
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            const sanitizedPath = (0, privacy_1.sanitizeFilePath)(filePath, workspaceRoot);
            const sanitizedPayload = (0, privacy_1.sanitizePayload)(payload, workspaceRoot);
            const studentCheck = (0, privacy_1.verifyStudentIdAnonymization)(cfg.assignmentId || 'unknown');
            const expParticipantId = extensionContext?.workspaceState?.get('telemetry_participant_id');
            const expTaskCondition = extensionContext?.workspaceState?.get('telemetry_task_condition');
            const isExperimental = cfg.operatingMode === 'experimental';
            const studentIdToUse = isExperimental ? (expParticipantId || 'P01') : studentCheck.sanitizedId;
            const taskIdToUse = isExperimental ? (expTaskCondition || 'TASK_A_MANUAL') : (cfg.assignmentId || '');
            const enrichedPayload = {
                ...sanitizedPayload,
                operatingMode: cfg.operatingMode,
                participantId: isExperimental ? (expParticipantId || 'P01') : undefined,
                taskCondition: isExperimental ? (expTaskCondition || 'TASK_A_MANUAL') : undefined,
                conditionLabel: isExperimental ? (expTaskCondition === 'TASK_B_AI' ? 1 : 0) : undefined
            };
            (0, event_store_1.insertEvent)({
                session_id: currentSessionId,
                student_id: studentIdToUse,
                task_id: taskIdToUse,
                repo_id: currentRepoId,
                branch: currentBranch,
                commit_sha: currentCommitSha,
                event_type: eventType,
                category,
                file_path: sanitizedPath,
                timestamp: Date.now(),
                payload_json: JSON.stringify(enrichedPayload)
            });
        }
        catch (err) {
            console.error('[CollabIntel] Error storing event:', err);
        }
    });
}
// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVATE & DEACTIVATE
// ─────────────────────────────────────────────────────────────────────────────
function activate(context) {
    extensionContext = context;
    console.log('[CollabIntel] Extension activating with SQLite storage, sensors & filtering...');
    // ── Plan 6: Start Micro-Performance Profiler ───────────────────────────
    (0, performance_1.startPerformanceProfiler)(context, 30000);
    // ── Initialize SQLite Database (Plan 3) ────────────────────────────────
    try {
        globalStoragePath = context.globalStorageUri.fsPath;
        (0, database_1.initDatabase)(globalStoragePath);
        dbInitialized = true;
        console.log('[CollabIntel] SQLite database ready.');
    }
    catch (err) {
        console.error('[CollabIntel] Failed to initialize SQLite:', err);
        dbInitialized = false;
    }
    // ── Status Bar ─────────────────────────────────────────────────────────
    (0, status_bar_1.createStatusBar)(context);
    // ── Sidebar Provider (Plan 6: External HTML & Audit callback) ──────────
    const sidebarProvider = new sidebar_provider_1.CollabIntelSidebarProvider(context.extensionUri, {
        getTelemetrySnapshot: () => getTelemetrySnapshot(),
        saveAndSyncSession: () => saveAndSyncSession(context),
        openInteractiveDashboard: (tab) => openDashboard(tab),
        testBackendConnection: () => (0, http_client_1.testBackendConnection)((0, settings_1.getConfig)()),
        viewQueueAudit: () => (0, audit_viewer_1.openAuditWebview)(context, globalStoragePath, async () => {
            if (dbInitialized) {
                await (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
            }
        })
    });
    sidebarProviderInstance = sidebarProvider;
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('collabintel.sidebarView', sidebarProvider));
    // ── Plan 6: Check Server URL Security (HTTPS enforcement) ──────────────
    const cfg = (0, settings_1.getConfig)();
    if (cfg.serverUrl) {
        (0, privacy_1.checkAndWarnInsecureServerUrl)(cfg.serverUrl);
    }
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('collabintel.operatingMode')) {
            (0, status_bar_1.refreshStatusBarPendingCount)();
            broadcastStateToWebviews();
        }
        if (e.affectsConfiguration('collabintel.serverUrl')) {
            const currentCfg = (0, settings_1.getConfig)();
            if (currentCfg.serverUrl)
                (0, privacy_1.checkAndWarnInsecureServerUrl)(currentCfg.serverUrl);
        }
    }));
    // ── Initial Setup & Dual-Mode Check ─────────────────────────────────────
    if (cfg.operatingMode === 'experimental') {
        (0, onboarding_1.ensureParticipantSession)(context).catch(err => {
            console.warn('[CollabIntel] Experimental onboarding notice:', err);
        });
        (0, status_bar_1.updateStatusBar)('tracking', broadcastStateToWebviews);
    }
    else if (!cfg.authToken || !cfg.assignmentId) {
        (0, status_bar_1.updateStatusBar)('unconfigured', broadcastStateToWebviews);
        vscode.window.showInformationMessage('CollabIntel [Real Mode]: Setup required to begin tracking your repository.', 'Open Setup').then(choice => {
            if (choice === 'Open Setup')
                openDashboard('setup');
        });
    }
    // ── Start Session ──────────────────────────────────────────────────────
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    if (workspaceRoot) {
        startSession(workspaceRoot);
    }
    // ── Plan 4: Health Check & Batch Telemetry Sync Engine ────────────────
    if (cfg.serverUrl) {
        health_check_1.defaultHealthCheckMonitor.start(cfg.serverUrl, 15000);
        context.subscriptions.push({
            dispose: () => health_check_1.defaultHealthCheckMonitor.stop()
        });
        health_check_1.defaultHealthCheckMonitor.onStatusChange((isOnline) => {
            broadcastStateToWebviews();
        });
    }
    // Trigger initial batch sync if database is ready
    if (dbInitialized) {
        (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
    }
    // ── Plan 5: Sliding Window Manager (W=5 min, step=1 min sliding stride) ──
    sliding_window_1.defaultSlidingWindowManager.start();
    context.subscriptions.push({
        dispose: () => sliding_window_1.defaultSlidingWindowManager.stop()
    });
    context.subscriptions.push(sliding_window_1.defaultSlidingWindowManager.onWindowComputed(() => {
        broadcastStateToWebviews();
    }));
    // ── Line-Level Provenance & Visual Highlighting ─────────────────────────
    line_provenance_tracker_1.defaultLineProvenanceTracker.register(context);
    context.subscriptions.push(line_provenance_tracker_1.defaultLineProvenanceTracker);
    context.subscriptions.push(line_provenance_tracker_1.defaultLineProvenanceTracker.onProvenanceChanged(() => {
        broadcastStateToWebviews();
    }));
    // ── Dashboard Helper (Plan 6: ML tab & sliding window compute) ─────────
    function openDashboard(tab) {
        (0, dashboard_panel_1.openInteractiveDashboard)(context, {
            getTelemetrySnapshot: () => getTelemetrySnapshot(),
            saveAndSyncSession: () => saveAndSyncSession(context),
            testBackendConnection: (cfg) => (0, http_client_1.testBackendConnection)(cfg),
            updateStatusBar: (state) => (0, status_bar_1.updateStatusBar)(state, broadcastStateToWebviews),
            startSession: (root) => startSession(root),
            getConfig: () => (0, settings_1.getConfig)(),
            computeSlidingWindow: () => {
                const win = sliding_window_1.defaultSlidingWindowManager.computeCurrentWindow();
                broadcastStateToWebviews();
                return win;
            },
            viewQueueAudit: () => (0, audit_viewer_1.openAuditWebview)(context, globalStoragePath, async () => {
                if (dbInitialized) {
                    await (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
                }
            })
        }, tab || 'overview');
    }
    // ══════════════════════════════════════════════════════════════════════
    //  SENSOR REGISTRATION (Plan 2)
    // ══════════════════════════════════════════════════════════════════════
    // ── Diagnostic Sensor ──────────────────────────────────────────────────
    diagnosticSensor.register(context, () => {
        (0, performance_1.profileHook)('sensor:diagnostic', () => broadcastStateToWebviews());
    });
    // ── Focus Sensor (replaces old onDidChangeActiveTextEditor handler) ────
    focusSensor.register(context, () => {
        (0, performance_1.profileHook)('sensor:focusActivity', () => {
            lastActivityTime = Date.now();
            idleSensor.reportActivity();
            if (!sessionStart && workspaceRoot)
                startSession(workspaceRoot);
        });
    }, () => {
        (0, performance_1.profileHook)('sensor:focusUpdate', () => broadcastStateToWebviews());
    });
    // ── Idle Sensor ────────────────────────────────────────────────────────
    idleSensor.start((newState) => {
        if (newState === 'IDLE' && sessionStart) {
            saveAndSyncSession(context).then(() => {
                (0, status_bar_1.updateStatusBar)('idle', broadcastStateToWebviews);
                sessionStart = null;
            });
        }
    });
    // ── Document Sensor (file opens + save tracking) ───────────────────────
    documentSensor.register(context, () => {
        (0, performance_1.profileHook)('sensor:documentActivity', () => {
            lastActivityTime = Date.now();
            idleSensor.reportActivity();
            if (!sessionStart && workspaceRoot)
                startSession(workspaceRoot);
        });
    }, () => {
        (0, performance_1.profileHook)('sensor:documentUpdate', () => broadcastStateToWebviews());
    });
    // ══════════════════════════════════════════════════════════════════════
    //  EVENT HANDLERS (enhanced with noise filtering & sensors)
    // ══════════════════════════════════════════════════════════════════════
    // ── Window Focus Clipboard Pre-caching ──────────────────────────────────
    context.subscriptions.push(vscode.window.onDidChangeWindowState(async (state) => {
        if (state.focused) {
            try {
                const text = await vscode.env.clipboard.readText();
                if (text) {
                    lastReadClipboardText = text;
                    lastClipboardReadTime = Date.now();
                    addToClipboardHistory(text);
                }
            }
            catch { }
        }
    }));
    // ── Text Document Change Handler (Keystroke / Paste / AI Detection) ────
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.document.uri.scheme !== 'file')
            return;
        // Use shouldTrackEdit: checks blacklist + lockfile + active tab validation
        if (!(0, noise_filter_1.shouldTrackEdit)(event.document.uri))
            return;
        const now = Date.now();
        lastActivityTime = now;
        idleSensor.reportActivity();
        if (!sessionStart && workspaceRoot)
            startSession(workspaceRoot);
        const relativePath = vscode.workspace.asRelativePath(event.document.uri, false).replace(/\\/g, '/');
        editedFiles.add(relativePath);
        const fileItem = getOrCreateFileActivity(relativePath, event.document.uri);
        const records = fileItem.lineRecords || [];
        fileItem.lineRecords = records;
        const timeIso = new Date().toISOString();
        const isCurrentlyOffline = (0, status_bar_1.getStatusState)() === 'error';
        for (const change of event.contentChanges) {
            const text = change.text;
            const textLen = text.length;
            const startLine0 = change.range.start.line;
            const endLine0 = change.range.end.line;
            const deletedLines = endLine0 - startLine0;
            const insertedLines = text.split(/\r?\n/);
            const addedLines = insertedLines.length - 1;
            // 1. Handle Line Deletions & Line Number Shifting
            if (deletedLines > 0) {
                linesRemovedCount += deletedLines;
                fileItem.linesRemoved += deletedLines;
                // Remove records for lines deleted within the range (exclusive of startLine, up to endLine)
                const kept = records.filter(r => !(r.lineNumber > startLine0 + 1 && r.lineNumber <= endLine0 + 1));
                records.length = 0;
                records.push(...kept);
                // Shift all lines that were after the deleted range downwards
                for (const r of records) {
                    if (r.lineNumber > endLine0 + 1) {
                        r.lineNumber -= deletedLines;
                    }
                }
            }
            // Track net deleted characters
            if (change.rangeLength > 0) {
                netDeletedChars += change.rangeLength;
                fileItem.netDeletedChars += change.rangeLength;
            }
            // Pure deletion with no text inserted
            if (textLen === 0) {
                continue;
            }
            // 2. Handle Line Insertions & Line Number Shifting
            if (addedLines > 0) {
                linesAddedCount += addedLines;
                fileItem.linesAdded += addedLines;
                // Shift existing records after the insertion point upwards
                for (const r of records) {
                    if (r.lineNumber > startLine0 + 1) {
                        r.lineNumber += addedLines;
                    }
                }
            }
            // Track net inserted characters
            netInsertedChars += textLen;
            fileItem.netInsertedChars += textLen;
            // 3. Typing Pattern & Provenance Classification
            const nonEmptyLines = insertedLines.filter(l => l.trim().length > 0);
            const isMultiLine = nonEmptyLines.length > 1;
            const isSingleKey = textLen === 1;
            const isEnterKey = text === '\n' || text === '\r\n';
            const isTabOrIndent = /^\s{1,8}$/.test(text);
            const isAutoClosePair = /^(\(\)|\[\]|\{\}|""|''|``|<>)$/.test(text);
            let clipboardMatched = false;
            if (!isSingleKey && !isEnterKey && !isTabOrIndent && !isAutoClosePair) {
                const currentClip = await refreshClipboardText();
                clipboardMatched = isMatchingClipboard(text, currentClip);
            }
            const hasAiMarker = hasAiSignatures(text);
            let lineProvenance = 'manual';
            // ── Provenance Decision Logic ──
            // A. Explicit AI Assistant signatures (e.g. pasted ChatGPT code with prompts/comments or markdown blocks)
            if (hasAiMarker) {
                lineProvenance = 'ai_assisted';
                aiEventsCount++;
                aiCharsCount += textLen;
                fileItem.aiEvents++;
                fileItem.aiChars += textLen;
                storeEvent('KEYSTROKE', fileItem.category, relativePath, {
                    provenance: 'ai_assisted',
                    action: 'ai_assistant_code_generation',
                    charCount: textLen,
                    lineCount: addedLines
                });
                idleSensor.reportActivity();
            }
            // B. IDE Auto-Indentation / Formatting whitespace (editor generated, NOT human keystroke)
            else if (isTabOrIndent && textLen > 1) {
                // Do not increment keystrokeCount or manualCharsCount - automated editor indent
                idleSensor.reportActivity();
            }
            // C. User Clipboard Paste or Multi-Line / Large insertion burst
            // (Ctrl+V from browser/external window, workspace copy, multi-line paste, or multi-char burst)
            else if (clipboardMatched || isMultiLine || textLen > 1) {
                lineProvenance = 'copy_paste';
                pasteCount++;
                charactersPasted += textLen;
                fileItem.pasteEvents++;
                fileItem.pasteChars += textLen;
                pasteBursts.push({
                    charCount: textLen,
                    lineCountDelta: addedLines,
                    textPreview: text.slice(0, 100),
                    timestamp: timeIso
                });
                storeEvent('PASTE_BURST', fileItem.category, relativePath, {
                    charCount: textLen,
                    lineCountDelta: addedLines,
                    textPreview: text.slice(0, 100)
                });
                idleSensor.reportActivity();
            }
            // D. Authentic Human Manual Keystroke (Strictly 1 physical keypress per event)
            else {
                lineProvenance = 'manual';
                const strokeInc = 1;
                keystrokeCount += strokeInc;
                manualCharsCount += textLen;
                fileItem.manualKeystrokes += strokeInc;
                fileItem.manualChars += textLen;
                storeEvent('KEYSTROKE', fileItem.category, relativePath, {
                    provenance: 'manual',
                    charCount: textLen
                });
                idleSensor.reportKeystroke();
            }
            // 4. Record Exact Line-by-Line Provenance
            insertedLines.forEach((lText, idx) => {
                const lNum = startLine0 + 1 + idx;
                const cleanLText = lText.replace(/\r$/, '');
                const lineRec = {
                    lineNumber: lNum,
                    lineText: cleanLText.slice(0, 120),
                    provenance: lineProvenance,
                    isOffline: isCurrentlyOffline,
                    timestamp: timeIso
                };
                const existIdx = records.findIndex(r => r.lineNumber === lNum);
                if (existIdx >= 0) {
                    records[existIdx] = lineRec;
                }
                else {
                    records.push(lineRec);
                }
            });
            // Keep lineRecords cleanly sorted by line number
            records.sort((a, b) => a.lineNumber - b.lineNumber);
            fileItem.lineRecords = records;
            // Keep visual editor decorations in perfect sync with telemetry
            line_provenance_tracker_1.defaultLineProvenanceTracker.markRange(event.document, startLine0, startLine0 + addedLines, lineProvenance);
            // Re-evaluate file-level typingProvenance
            const fTotal = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
            if (fTotal > 0) {
                const aiRatioFile = fileItem.aiChars / fTotal;
                const pasteRatioFile = fileItem.pasteChars / fTotal;
                const manualRatioFile = fileItem.manualChars / fTotal;
                if (aiRatioFile > 0.40)
                    fileItem.typingProvenance = 'ai_assisted';
                else if (pasteRatioFile > 0.20 || (fileItem.pasteEvents > 0 && pasteRatioFile > 0.10))
                    fileItem.typingProvenance = 'copy_paste';
                else if (manualRatioFile >= 0.70)
                    fileItem.typingProvenance = 'manual';
                else
                    fileItem.typingProvenance = 'mixed';
            }
        }
        broadcastStateToWebviews();
        triggerDebouncedAutoSync(context, 1500);
    }));
    // ── File Create Handler ────────────────────────────────────────────────
    context.subscriptions.push(vscode.workspace.onDidCreateFiles(event => {
        event.files.forEach(f => {
            if (!(0, noise_filter_1.shouldTrackFile)(f))
                return;
            lastActivityTime = Date.now();
            idleSensor.reportActivity();
            if (!sessionStart && workspaceRoot)
                startSession(workspaceRoot);
            const rel = vscode.workspace.asRelativePath(f, false).replace(/\\/g, '/');
            storeEvent('FILE_CREATE', (0, noise_filter_1.categorizeFile)(f), rel, { action: 'created' });
            try {
                if (fs.existsSync(f.fsPath) && fs.statSync(f.fsPath).isDirectory()) {
                    createdFolders.add(rel);
                }
                else {
                    createdFiles.add(rel);
                    const fileItem = getOrCreateFileActivity(rel, f);
                    fileItem.action = 'created';
                }
            }
            catch {
                createdFiles.add(rel);
            }
        });
        broadcastStateToWebviews();
        triggerDebouncedAutoSync(context, 1000);
    }));
    // ── File Delete Handler ────────────────────────────────────────────────
    context.subscriptions.push(vscode.workspace.onDidDeleteFiles(event => {
        event.files.forEach(f => {
            if (!(0, noise_filter_1.shouldTrackFile)(f))
                return;
            lastActivityTime = Date.now();
            idleSensor.reportActivity();
            if (!sessionStart && workspaceRoot)
                startSession(workspaceRoot);
            const rel = vscode.workspace.asRelativePath(f, false).replace(/\\/g, '/');
            storeEvent('FILE_DELETE', (0, noise_filter_1.categorizeFile)(f), rel, { action: 'deleted' });
            deletedFiles.add(rel);
            deletedFolders.add(rel);
            const fileItem = getOrCreateFileActivity(rel, f);
            fileItem.action = 'deleted';
        });
        broadcastStateToWebviews();
        triggerDebouncedAutoSync(context, 1000);
    }));
    // ── Background File Watcher (captures disk edits to closed files by external AI agents) ──
    const bgWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    bgWatcher.onDidChange(async (uri) => {
        if (uri.scheme !== 'file' || !(0, noise_filter_1.shouldTrackFile)(uri))
            return;
        const fsPath = uri.fsPath;
        const normUri = (0, noise_filter_1.normalizeFsPath)(fsPath);
        const isOpenInAnyEditor = vscode.workspace.textDocuments.some(doc => (0, noise_filter_1.normalizeFsPath)(doc.uri.fsPath) === normUri);
        if (!isOpenInAnyEditor) {
            try {
                const stats = await fs.promises.stat(fsPath);
                const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
                editedFiles.add(rel);
                const fileItem = getOrCreateFileActivity(rel, uri);
                fileItem.action = 'edited';
                // Read updated content from disk
                let content = '';
                try {
                    content = await fs.promises.readFile(fsPath, 'utf8');
                }
                catch { }
                const lines = content ? content.split(/\r?\n/) : [];
                const newDocLen = content.length;
                const loggedChars = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
                const deltaChars = Math.max(0, newDocLen - loggedChars);
                const mtimeIso = new Date(stats.mtimeMs).toISOString();
                if (!fileItem.lineRecords)
                    fileItem.lineRecords = [];
                let hasExplicitAi = false;
                lines.forEach((lineText, idx) => {
                    const lNum = idx + 1;
                    const cleanText = lineText.replace(/\r$/, '');
                    const exist = fileItem.lineRecords.find(r => r.lineNumber === lNum);
                    const trimmed = cleanText.trim();
                    const isAiLine = /^\/\/\s*(here('?s| is)|generated (by|with)|auto-?generated|ai[- ]assistant|copilot|chatgpt|claude|gemini|openai|step \d+:|helper function to)/i.test(trimmed) ||
                        /^\/\*\s*(auto-?generated|generated by ai)/i.test(trimmed);
                    if (isAiLine)
                        hasExplicitAi = true;
                    const defaultProv = isAiLine ? 'ai_assisted' : 'copy_paste';
                    if (!exist) {
                        fileItem.lineRecords.push({
                            lineNumber: lNum,
                            lineText: cleanText.slice(0, 120),
                            provenance: defaultProv,
                            isOffline: false,
                            timestamp: mtimeIso
                        });
                    }
                    else if (exist.lineText !== cleanText.slice(0, 120)) {
                        exist.lineText = cleanText.slice(0, 120);
                        if (isAiLine)
                            exist.provenance = 'ai_assisted';
                        exist.timestamp = mtimeIso;
                    }
                });
                if (hasExplicitAi) {
                    fileItem.aiChars += deltaChars;
                    fileItem.aiEvents += 1;
                    fileItem.typingProvenance = 'ai_assisted';
                    aiCharsCount += deltaChars;
                    aiEventsCount += 1;
                }
                else {
                    fileItem.pasteChars += deltaChars;
                    fileItem.pasteEvents += 1;
                    fileItem.typingProvenance = fileItem.manualChars > 0 ? 'mixed' : 'copy_paste';
                    charactersPasted += deltaChars;
                    pasteCount += 1;
                }
                fileItem.linesAdded = Math.max(fileItem.linesAdded, lines.length);
                storeEvent('KEYSTROKE', (0, noise_filter_1.categorizeFile)(uri), rel, {
                    provenance: hasExplicitAi ? 'ai_assisted' : 'copy_paste',
                    action: hasExplicitAi ? 'external_agent_file_mod' : 'disk_file_mod',
                    isExternalDiskWrite: true,
                    isOpenInEditor: false,
                    charCount: deltaChars,
                    sizeBytes: stats.size,
                    mtimeMs: stats.mtimeMs,
                    description: hasExplicitAi ? 'Background edit by AI tool' : 'File saved/updated on disk'
                });
                broadcastStateToWebviews();
                triggerDebouncedAutoSync(context, 1000);
            }
            catch { }
        }
    });
    bgWatcher.onDidCreate(async (uri) => {
        if (uri.scheme !== 'file' || !(0, noise_filter_1.shouldTrackFile)(uri))
            return;
        const fsPath = uri.fsPath;
        // Skip files currently open in editor – real-time tracking handles them
        const normUri2 = (0, noise_filter_1.normalizeFsPath)(fsPath);
        const isOpenInEditor = vscode.workspace.textDocuments.some(doc => (0, noise_filter_1.normalizeFsPath)(doc.uri.fsPath) === normUri2);
        if (isOpenInEditor)
            return;
        try {
            const stats = await fs.promises.stat(fsPath);
            const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
            createdFiles.add(rel);
            const fileItem = getOrCreateFileActivity(rel, uri);
            fileItem.action = 'created';
            // Read created content from disk
            let content = '';
            try {
                content = await fs.promises.readFile(fsPath, 'utf8');
            }
            catch { }
            const lines = content ? content.split(/\r?\n/) : [];
            const docLen = content.length;
            // Classify lines accurately based on content characteristics
            if (docLen > 0 && fileItem.manualKeystrokes === 0) {
                const mtimeIso = new Date(stats.mtimeMs).toISOString();
                let aiLineCount = 0;
                fileItem.lineRecords = lines.map((lineText, idx) => {
                    const cleanText = lineText.replace(/\r$/, '');
                    const trimmed = cleanText.trim();
                    const isAi = /^\/\/\s*(here('?s| is)|generated (by|with)|auto-?generated|ai[- ]assistant|copilot|chatgpt|claude|gemini|openai|step \d+:|helper function to)/i.test(trimmed) ||
                        /^\/\*\s*(auto-?generated|generated by ai)/i.test(trimmed);
                    const p = isAi ? 'ai_assisted' : 'copy_paste';
                    if (p === 'ai_assisted')
                        aiLineCount++;
                    return {
                        lineNumber: idx + 1,
                        lineText: cleanText.slice(0, 120),
                        provenance: p,
                        isOffline: false,
                        timestamp: mtimeIso
                    };
                });
                fileItem.linesAdded = lines.length;
                linesAddedCount += lines.length;
                if (aiLineCount > 0) {
                    fileItem.aiChars = docLen;
                    fileItem.aiEvents = Math.max(1, fileItem.aiEvents);
                    fileItem.typingProvenance = 'ai_assisted';
                    aiCharsCount += docLen;
                    aiEventsCount += 1;
                }
                else {
                    fileItem.pasteChars = docLen;
                    fileItem.pasteEvents = Math.max(1, fileItem.pasteEvents);
                    fileItem.typingProvenance = 'copy_paste';
                    charactersPasted += docLen;
                    pasteCount += 1;
                }
                fileItem.manualChars = 0;
                fileItem.manualKeystrokes = 0;
                storeEvent('FILE_CREATE', (0, noise_filter_1.categorizeFile)(uri), rel, {
                    provenance: fileItem.typingProvenance,
                    action: fileItem.typingProvenance === 'ai_assisted' ? 'ai_assistant_file_create' : 'file_create',
                    isExternalDiskWrite: true,
                    charCount: docLen,
                    sizeBytes: stats.size,
                    mtimeMs: stats.mtimeMs,
                    description: fileItem.typingProvenance === 'ai_assisted' ? 'New file created by AI assistant' : 'New file created on disk'
                });
                broadcastStateToWebviews();
                triggerDebouncedAutoSync(context, 1000);
            }
        }
        catch { }
    });
    context.subscriptions.push(bgWatcher);
    // ── Save Handler (enhanced with save count) ────────────────────────────
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.uri.scheme !== 'file')
            return;
        if (!(0, noise_filter_1.shouldTrackFile)(doc.uri))
            return;
        lastActivityTime = Date.now();
        idleSensor.reportActivity();
        if (!sessionStart && workspaceRoot)
            startSession(workspaceRoot);
        // Track save count via document sensor
        documentSensor.recordSave();
        const rel = vscode.workspace.asRelativePath(doc.uri, false).replace(/\\/g, '/');
        storeEvent('SAVE', (0, noise_filter_1.categorizeFile)(doc.uri), rel, { lineCount: doc.lineCount, charCount: doc.getText().length });
        let fileItem = fileActivityMap.get(rel);
        const docLen = doc.getText().length;
        const lineCount = doc.lineCount;
        // Detect file content that appeared without any keyboard/clipboard telemetry
        if (!fileItem) {
            fileItem = {
                filePath: rel,
                action: 'edited',
                category: (0, noise_filter_1.categorizeFile)(doc.uri),
                manualChars: 0,
                pasteChars: 0,
                aiChars: docLen,
                manualKeystrokes: 0,
                pasteEvents: 0,
                aiEvents: 1,
                typingProvenance: 'ai_assisted',
                linesAdded: lineCount,
                linesRemoved: 0,
                netInsertedChars: docLen,
                netDeletedChars: 0,
                saveCount: 1,
                lineRecords: [],
                timestamp: new Date().toISOString()
            };
            aiEventsCount++;
            aiCharsCount += docLen;
            linesAddedCount += lineCount;
            fileActivityMap.set(rel, fileItem);
            editedFiles.add(rel);
        }
        else {
            fileItem.saveCount++;
            const loggedChars = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
            const delta = docLen - loggedChars;
            if (delta > 50 && fileItem.aiEvents === 0 && fileItem.pasteEvents === 0 && fileItem.manualChars < 10) {
                fileItem.aiChars += delta;
                fileItem.aiEvents += 1;
                fileItem.typingProvenance = 'ai_assisted';
                aiEventsCount++;
                aiCharsCount += delta;
            }
        }
        broadcastStateToWebviews();
        triggerDebouncedAutoSync(context, 500);
    }));
    // ── Git Commit Watcher ─────────────────────────────────────────────────
    if (workspaceRoot) {
        if (fs.existsSync(path.join(workspaceRoot, '.git'))) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.join(workspaceRoot, '.git'), 'COMMIT_EDITMSG'), false, false, true);
            watcher.onDidChange(async () => {
                lastActivityTime = Date.now();
                idleSensor.reportActivity();
                if (!sessionStart)
                    startSession(workspaceRoot);
                await refreshGitContext(workspaceRoot);
                storeEvent('GIT_COMMIT', 'SYSTEM', '', { action: 'commit_detected', branch: currentBranch, commit_sha: currentCommitSha });
                vscode.window.setStatusBarMessage('$(sync~spin) CollabIntel: Git commit detected, syncing...', 4000);
                await saveAndSyncSession(context);
            });
            context.subscriptions.push(watcher);
            // Watch .git/HEAD for branch switching
            const headWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.join(workspaceRoot, '.git'), 'HEAD'), false, false, true);
            headWatcher.onDidChange(async () => {
                await refreshGitContext(workspaceRoot);
            });
            context.subscriptions.push(headWatcher);
        }
    }
    // ── Periodic Sync Timer ────────────────────────────────────────────────
    const { syncIntervalMinutes } = (0, settings_1.getConfig)();
    const syncMs = Math.max(1, syncIntervalMinutes) * 60 * 1000;
    syncTimer = setInterval(() => {
        if (sessionStart) {
            saveAndSyncSession(context);
        }
        else {
            flushOfflineCache(context);
        }
    }, syncMs);
    // ── Command Registration ───────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.setup', () => openDashboard('setup')));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.openDashboard', () => openDashboard('overview')));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.sync', async () => {
        await saveAndSyncSession(context);
        if (dbInitialized) {
            await (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
        }
        vscode.window.showInformationMessage('CollabIntel: Telemetry synced.');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.clearCache', async () => {
        await context.globalState.update('offline_sessions', []);
        vscode.window.showInformationMessage('CollabIntel: Local offline queue cleared.');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.reconcile', async () => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        if (!root) {
            vscode.window.showWarningMessage('No active workspace folder to reconcile.');
            return;
        }
        try {
            const { commits } = await (0, git_client_1.fetchLocalCommitsSince)(root, '');
            const lookbackMs = 24 * 60 * 60 * 1000;
            const events = (0, event_store_1.queryEventsByTimeRange)(Date.now() - lookbackMs, Date.now());
            const results = (0, reconciler_1.reconcileEventsWithCommits)(events, commits);
            const matched = results.filter(r => r.matchedCommit).length;
            vscode.window.showInformationMessage(`CollabIntel: Reconciled ${results.length} sessions (${matched} matched to Git commits).`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Reconciliation error: ${err.message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.testConnection', async () => {
        const res = await (0, http_client_1.testBackendConnection)((0, settings_1.getConfig)());
        if (res.success)
            vscode.window.showInformationMessage(`CollabIntel: ${res.message}`);
        else
            vscode.window.showErrorMessage(`CollabIntel: ${res.message}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.status', () => openDashboard('overview')));
    context.subscriptions.push((0, audit_viewer_1.registerAuditViewerCommand)(context, globalStoragePath, async () => {
        if (dbInitialized) {
            await (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
        }
    }));
    // ── Volunteer Experiment & Offline Export Commands (Phase 1) ───────────
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.switchMode', async () => {
        await (0, onboarding_1.switchOperatingMode)(context, () => {
            (0, status_bar_1.refreshStatusBarPendingCount)();
            broadcastStateToWebviews();
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.setupParticipant', () => (0, onboarding_1.reconfigureParticipant)(context)));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.switchTask', () => (0, onboarding_1.switchTaskCondition)(context)));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.statusBarMenu', async () => {
        const currentCfg = (0, settings_1.getConfig)();
        if (currentCfg.operatingMode === 'experimental') {
            const pId = context.workspaceState.get('telemetry_participant_id') || 'P01';
            const task = context.workspaceState.get('telemetry_task_condition') === 'TASK_B_AI' ? 'Task B (AI-Assisted)' : 'Task A (Manual)';
            const pick = await vscode.window.showQuickPick([
                { label: '$(arrow-swap) Switch Task Condition', description: `Currently active: ${task}`, action: 'switchTask' },
                { label: '$(account) Change Participant ID', description: `Currently active: ${pId}`, action: 'setupParticipant' },
                { label: '$(shield) Switch to Real Mode', description: 'Switch to regular coursework tracking', action: 'switchMode' },
                { label: '$(dashboard) Open Interactive Dashboard', description: 'View live provenance & metrics', action: 'openDashboard' },
                { label: '$(cloud-download) Export Experiment Data (.sqlite)', description: 'Save study database file', action: 'exportBundle' }
            ], {
                title: `INCODE Experimental Mode [Participant ${pId} · ${task}]`,
                placeHolder: 'Select action'
            });
            if (pick) {
                if (pick.action === 'switchTask')
                    await (0, onboarding_1.switchTaskCondition)(context);
                else if (pick.action === 'setupParticipant')
                    await (0, onboarding_1.reconfigureParticipant)(context);
                else if (pick.action === 'switchMode')
                    await (0, onboarding_1.switchOperatingMode)(context);
                else if (pick.action === 'openDashboard')
                    openDashboard('overview');
                else if (pick.action === 'exportBundle')
                    vscode.commands.executeCommand('collabintel.exportLocalData');
                (0, status_bar_1.refreshStatusBarPendingCount)();
                broadcastStateToWebviews();
            }
        }
        else {
            openDashboard('overview');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.toggleProvenanceHighlighting', () => {
        const enabled = line_provenance_tracker_1.defaultLineProvenanceTracker.toggleHighlighting();
        broadcastStateToWebviews();
        return enabled;
    }), vscode.commands.registerCommand('collabintel.toggleProvenanceHighlighting', () => {
        const enabled = line_provenance_tracker_1.defaultLineProvenanceTracker.toggleHighlighting();
        broadcastStateToWebviews();
        return enabled;
    }));
    function applyProvenanceToSelection(editor, prov) {
        const doc = editor.document;
        if (doc.uri.scheme !== 'file')
            return;
        const sel = editor.selection;
        const start = Math.min(sel.start.line, sel.end.line);
        const end = Math.max(sel.start.line, sel.end.line);
        // Update in-editor decorations
        line_provenance_tracker_1.defaultLineProvenanceTracker.markRange(doc, start, end, prov);
        // Update telemetry records
        const relativePath = vscode.workspace.asRelativePath(doc.uri, false).replace(/\\/g, '/');
        const fileItem = getOrCreateFileActivity(relativePath, doc.uri);
        const records = fileItem.lineRecords || [];
        const timeIso = new Date().toISOString();
        const isCurrentlyOffline = (0, status_bar_1.getStatusState)() === 'error';
        for (let l = start; l <= end; l++) {
            const lText = doc.lineAt(l).text.slice(0, 120);
            const lineRec = {
                lineNumber: l + 1,
                lineText: lText,
                provenance: prov,
                isOffline: isCurrentlyOffline,
                timestamp: timeIso
            };
            const existIdx = records.findIndex(r => r.lineNumber === l + 1);
            if (existIdx >= 0)
                records[existIdx] = lineRec;
            else
                records.push(lineRec);
        }
        records.sort((a, b) => a.lineNumber - b.lineNumber);
        fileItem.lineRecords = records;
        // Recalculate file typingProvenance
        const fTotal = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
        if (fTotal > 0) {
            const aiRatio = fileItem.aiChars / fTotal;
            const pasteRatio = fileItem.pasteChars / fTotal;
            const manualRatio = fileItem.manualChars / fTotal;
            if (aiRatio > 0.40)
                fileItem.typingProvenance = 'ai_assisted';
            else if (pasteRatio > 0.20)
                fileItem.typingProvenance = 'copy_paste';
            else if (manualRatio >= 0.70)
                fileItem.typingProvenance = 'manual';
            else
                fileItem.typingProvenance = 'mixed';
        }
        broadcastStateToWebviews();
        triggerDebouncedAutoSync(context, 1000);
        const badge = prov === 'manual' ? '[MANUAL]' : prov === 'ai_assisted' ? '[AI]' : '[PASTED]';
        vscode.window.showInformationMessage(`Lines ${start + 1}–${end + 1} marked as ${badge}.`);
    }
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.markLineManual', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor)
            applyProvenanceToSelection(editor, 'manual');
    }), vscode.commands.registerCommand('collabintel.markLineAi', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor)
            applyProvenanceToSelection(editor, 'ai_assisted');
    }), vscode.commands.registerCommand('collabintel.markLinePasted', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor)
            applyProvenanceToSelection(editor, 'copy_paste');
    }), vscode.commands.registerCommand('collabintel.chooseLineProvenance', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const choice = await vscode.window.showQuickPick([
            { label: '✍️ [MANUAL]', description: 'Mark selected lines as manually typed code', value: 'manual' },
            { label: '🤖 [AI]', description: 'Mark selected lines as AI generated / Copilot assistance', value: 'ai_assisted' },
            { label: '📋 [PASTED]', description: 'Mark selected lines as pasted from external clipboard', value: 'copy_paste' }
        ], { placeHolder: 'Select Provenance Status for Selected Line(s)' });
        if (choice) {
            applyProvenanceToSelection(editor, choice.value);
        }
    }));
    // 1-Click offline failsafe exporter
    (0, export_bundle_1.registerExportCommand)(context, globalStoragePath);
    // ── Flush Offline Cache on Startup ─────────────────────────────────────
    flushOfflineCache(context);
    // ── Prune old synced records (7-day retention) ─────────────────────────
    if (dbInitialized) {
        try {
            const pruned = (0, event_store_1.pruneOldRecords)();
            if (pruned > 0)
                console.log(`[CollabIntel] Pruned ${pruned} old synced events.`);
        }
        catch (err) {
            console.error('[CollabIntel] Error pruning old records:', err);
        }
    }
    console.log('[CollabIntel] Extension with SQLite storage, sensors & filtering activated.');
}
exports.activate = activate;
function deactivate() {
    if (syncTimer)
        clearInterval(syncTimer);
    (0, performance_1.stopPerformanceProfiler)();
    health_check_1.defaultHealthCheckMonitor.stop();
    sliding_window_1.defaultSlidingWindowManager.stop();
    idleSensor.dispose();
    diagnosticSensor.dispose();
    focusSensor.dispose();
    documentSensor.dispose();
    // Close SQLite database gracefully (Plan 3)
    if (dbInitialized) {
        (0, database_1.closeDatabase)();
        dbInitialized = false;
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map