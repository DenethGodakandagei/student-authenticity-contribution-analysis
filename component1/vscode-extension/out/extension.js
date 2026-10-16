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
exports.deactivate = exports.activate = void 0;
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
// ─────────────────────────────────────────────────────────────────────────────
//  PROVENANCE & TELEMETRY SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────
function computeLiveProvenance() {
    const manual = keystrokeCount;
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
        performance: (0, performance_1.getPerformanceStats)()
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
    const offline = context.globalState.get('offline_sessions') || [];
    if (offline.length === 0)
        return;
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
            const studentIdToUse = expParticipantId || studentCheck.sanitizedId;
            const taskIdToUse = expTaskCondition || cfg.assignmentId || '';
            const enrichedPayload = {
                ...sanitizedPayload,
                participantId: expParticipantId || 'P01',
                taskCondition: expTaskCondition || 'TASK_A_MANUAL',
                conditionLabel: expTaskCondition === 'TASK_B_AI' ? 1 : 0
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
        if (e.affectsConfiguration('collabintel.serverUrl')) {
            const currentCfg = (0, settings_1.getConfig)();
            if (currentCfg.serverUrl)
                (0, privacy_1.checkAndWarnInsecureServerUrl)(currentCfg.serverUrl);
        }
    }));
    // ── Initial Setup & Experiment Onboarding Check ────────────────────────
    (0, onboarding_1.ensureParticipantSession)(context).catch(err => {
        console.warn('[CollabIntel] Onboarding dialog notice:', err);
    });
    if (!cfg.authToken || !cfg.assignmentId) {
        (0, status_bar_1.updateStatusBar)('unconfigured', broadcastStateToWebviews);
        vscode.window.showInformationMessage('CollabIntel: Setup required to begin tracking your repository.', 'Open Setup').then(choice => {
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
    // ── Plan 5: Sliding Window Manager (every 2.5 min, 5 min window) ──────
    sliding_window_1.defaultSlidingWindowManager.start();
    context.subscriptions.push({
        dispose: () => sliding_window_1.defaultSlidingWindowManager.stop()
    });
    context.subscriptions.push(sliding_window_1.defaultSlidingWindowManager.onWindowComputed(() => {
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
    // ── Text Document Change Handler (Keystroke / Paste / AI Detection) ────
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.document.uri.scheme !== 'file')
            return;
        // Use shouldTrackEdit: checks blacklist + lockfile + active tab validation
        if (!(0, noise_filter_1.shouldTrackEdit)(event.document.uri))
            return;
        const now = Date.now();
        const timeDelta = lastActivityTime > 0 ? (now - lastActivityTime) : 150;
        lastActivityTime = now;
        idleSensor.reportActivity();
        if (!sessionStart && workspaceRoot)
            startSession(workspaceRoot);
        const relativePath = vscode.workspace.asRelativePath(event.document.uri, false).replace(/\\/g, '/');
        editedFiles.add(relativePath);
        const fileItem = getOrCreateFileActivity(relativePath, event.document.uri);
        // Read OS clipboard as the gold standard paste signal
        let clipboardText = '';
        try {
            clipboardText = await vscode.env.clipboard.readText();
        }
        catch {
            clipboardText = '';
        }
        for (const change of event.contentChanges) {
            const text = change.text;
            const textLen = text.length;
            // Track net deleted chars (rangeLength = chars replaced/deleted)
            if (change.rangeLength > 0) {
                netDeletedChars += change.rangeLength;
                fileItem.netDeletedChars += change.rangeLength;
            }
            if (textLen === 0)
                continue; // pure deletion, no insertion
            // Track net inserted chars
            netInsertedChars += textLen;
            fileItem.netInsertedChars += textLen;
            const added = text.split('\n').length - 1;
            if (added > 0) {
                linesAddedCount += added;
                fileItem.linesAdded += added;
            }
            if (change.rangeLength > 0) {
                const removed = change.range.end.line - change.range.start.line;
                if (removed > 0) {
                    linesRemovedCount += removed;
                    fileItem.linesRemoved += removed;
                }
            }
            // PRIMARY TIER 1: Exact Clipboard Match (Ctrl+V / User Clipboard Paste)
            const normEndings = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const clipNorm = normEndings(clipboardText);
            const textNorm = normEndings(text);
            const clipTrimmed = clipNorm.trim();
            const textTrimmed = textNorm.trim();
            const isClipboardMatch = clipNorm.length > 0 && textTrimmed.length > 0 && (textNorm === clipNorm ||
                textTrimmed === clipTrimmed ||
                clipNorm.startsWith(textNorm) ||
                clipTrimmed.startsWith(textTrimmed) ||
                (textTrimmed.length >= 6 && clipTrimmed.includes(textTrimmed)) ||
                (clipTrimmed.length >= 6 && textTrimmed.includes(clipTrimmed)));
            // AI AGENT vs USER PASTE vs MANUAL TYPING SIGNALS:
            const lines = text.split(/\r?\n/);
            const nonEmptyLines = lines.filter(l => l.trim().length > 0);
            const isMultiLine = nonEmptyLines.length > 1;
            const isLargeBlock = textLen >= 25 && isMultiLine;
            const isInstantBurstWithoutClipboard = isMultiLine && textLen >= 40 && timeDelta < 80 && !isClipboardMatch;
            let lineProvenance = 'manual';
            // 1. User Clipboard Paste
            if (isClipboardMatch || isLargeBlock) {
                pasteCount++;
                charactersPasted += textLen;
                fileItem.pasteEvents++;
                fileItem.pasteChars += textLen;
                lineProvenance = 'copy_paste';
                // Record paste burst detail with text preview
                pasteBursts.push({
                    charCount: textLen,
                    lineCountDelta: added,
                    textPreview: text.slice(0, 100),
                    timestamp: new Date().toISOString()
                });
                // Store PASTE_BURST event to SQLite
                storeEvent('PASTE_BURST', fileItem.category, relativePath, {
                    charCount: textLen,
                    lineCountDelta: added,
                    textPreview: text.slice(0, 100)
                });
                idleSensor.reportActivity();
            }
            // 2. AI Agent / Automated Code Synthesis
            else if (isInstantBurstWithoutClipboard) {
                aiEventsCount++;
                aiCharsCount += textLen;
                fileItem.aiEvents++;
                fileItem.aiChars += textLen;
                lineProvenance = 'ai_assisted';
                // Store AI event to SQLite
                storeEvent('KEYSTROKE', fileItem.category, relativePath, {
                    provenance: 'ai_assisted', charCount: textLen
                });
                idleSensor.reportActivity();
            }
            // 3. Genuine Manual Keystroke
            else {
                keystrokeCount++;
                fileItem.manualKeystrokes++;
                fileItem.manualChars += textLen;
                lineProvenance = 'manual';
                idleSensor.reportKeystroke();
                // Store KEYSTROKE event to SQLite
                storeEvent('KEYSTROKE', fileItem.category, relativePath, {
                    provenance: 'manual', charCount: textLen
                });
            }
            // Record exact line-by-line provenance
            if (!fileItem.lineRecords)
                fileItem.lineRecords = [];
            const startLineNum = change.range.start.line + 1;
            const insertedLines = text.split('\n');
            const timeIso = new Date().toISOString();
            const isCurrentlyOffline = (0, status_bar_1.getStatusState)() === 'error';
            const records = fileItem.lineRecords;
            insertedLines.forEach((lText, lIdx) => {
                const lNum = startLineNum + lIdx;
                const lineRec = {
                    lineNumber: lNum,
                    lineText: lText.slice(0, 120),
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
            // Re-evaluate file-level typingProvenance
            const fTotal = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
            if (fTotal > 0) {
                const aiRatioFile = fileItem.aiChars / fTotal;
                const pasteRatioFile = fileItem.pasteChars / fTotal;
                const manualRatioFile = fileItem.manualChars / fTotal;
                if (aiRatioFile > 0.40)
                    fileItem.typingProvenance = 'ai_assisted';
                else if (pasteRatioFile > 0.30)
                    fileItem.typingProvenance = 'copy_paste';
                else if (manualRatioFile >= 0.55)
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
        vscode.window.showInformationMessage('✅ CollabIntel: Telemetry synced successfully!');
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
            vscode.window.showInformationMessage(`✅ ${res.message}`);
        else
            vscode.window.showErrorMessage(`❌ ${res.message}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.status', () => openDashboard('overview')));
    context.subscriptions.push((0, audit_viewer_1.registerAuditViewerCommand)(context, globalStoragePath, async () => {
        if (dbInitialized) {
            await (0, batch_sync_1.triggerBatchSync)({ onStatusUpdate: broadcastStateToWebviews });
        }
    }));
    // ── Volunteer Experiment & Offline Export Commands (Phase 1) ───────────
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.setupParticipant', () => (0, onboarding_1.reconfigureParticipant)(context)));
    context.subscriptions.push(vscode.commands.registerCommand('collabintel.switchTask', () => (0, onboarding_1.switchTaskCondition)(context)));
    // 1-Click offline failsafe exporter
    (0, export_bundle_1.registerExportCommand)(context, globalStoragePath);
    // ── Closed-File Background Mutation Watcher (External Agent / Disk writes) ──
    const diskMutationWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    diskMutationWatcher.onDidChange(uri => {
        if (uri.scheme !== 'file' || !(0, noise_filter_1.shouldTrackFile)(uri))
            return;
        const isDocOpen = vscode.workspace.textDocuments.some(doc => !doc.isClosed && doc.uri.fsPath === uri.fsPath);
        if (!isDocOpen) {
            const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
            storeEvent('BACKGROUND_MUTATION', (0, noise_filter_1.categorizeFile)(uri), rel, {
                action: 'disk_mutation',
                external: true
            });
        }
    });
    context.subscriptions.push(diskMutationWatcher);
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