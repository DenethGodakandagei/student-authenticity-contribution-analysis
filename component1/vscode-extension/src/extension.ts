import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ─── Module Imports ──────────────────────────────────────────────────────────
import {
  FileActivityItem,
  LineProvenanceRecord,
  CodingProvenanceItem,
  SessionPayload,
  LocalCommit,
  StatusState,
  PasteBurstDetail
} from './types';
import { getConfig, IDLE_TIMEOUT_MS } from './config/settings';
import { postJson, testBackendConnection } from './utils/http-client';
import { shouldTrackFile, shouldTrackEdit, categorizeFile } from './filters/noise-filter';
import { detectRepoRemoteUrl, fetchLocalCommitsSince, getCurrentHeadHash, getCurrentBranch, getRepoRoot } from './git/git-client';
import { reconcileEventsWithCommits } from './git/reconciler';
import { createStatusBar, updateStatusBar, getStatusState, refreshStatusBarPendingCount } from './ui/status-bar';
import { CollabIntelSidebarProvider } from './ui/sidebar-provider';
import { openInteractiveDashboard, getActiveDashboardPanel } from './ui/dashboard-panel';

// ─── Sensor Imports (Plan 2) ─────────────────────────────────────────────────
import { DiagnosticSensor } from './sensors/diagnostic.sensor';
import { FocusSensor } from './sensors/focus.sensor';
import { IdleSensor } from './sensors/idle.sensor';
import { DocumentSensor } from './sensors/document.sensor';

// ─── Storage Imports (Plan 3) ────────────────────────────────────────────────
import { initDatabase, closeDatabase } from './storage/database';
import { insertEvent, pruneOldRecords, getQueueStatus, getPendingCount, queryEventsByTimeRange } from './storage/event-store';
import { generateUUID } from './utils/uuid';
import { EventType, EventCategory } from './types';

// ─── Sync Engine Imports (Plan 4) ────────────────────────────────────────────
import { defaultHealthCheckMonitor } from './sync/health-check';
import { triggerBatchSync } from './sync/batch-sync';

// ─── ML Features & Sliding Window (Plan 5) ───────────────────────────────────
import { defaultSlidingWindowManager } from './features/sliding-window';

// ─── UI Polish, Audit Viewer, Performance & Privacy (Plan 6) ─────────────────
import { registerAuditViewerCommand, openAuditWebview } from './ui/audit-viewer';
import {
  startPerformanceProfiler,
  stopPerformanceProfiler,
  profileHook,
  profileAsyncHook,
  getPerformanceStats
} from './utils/performance';
import {
  checkAndWarnInsecureServerUrl,
  sanitizePayload,
  sanitizeFilePath,
  verifyStudentIdAnonymization
} from './security/privacy';

// ─── Volunteer Experiment & Offline Export (Phase 1) ─────────────────────────
import { ensureParticipantSession, switchTaskCondition, reconfigureParticipant, getExperimentSession, switchOperatingMode } from './ui/onboarding';
import { registerExportCommand } from './ui/export-bundle';

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION & EXTENSION GLOBAL STATE
// ─────────────────────────────────────────────────────────────────────────────
let extensionContext: vscode.ExtensionContext;
let sessionStart: Date | null = null;
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
const editedFiles = new Set<string>();
const createdFiles = new Set<string>();
const deletedFiles = new Set<string>();
const createdFolders = new Set<string>();
const deletedFolders = new Set<string>();
const fileActivityMap = new Map<string, FileActivityItem>();
let cachedCommitsThisSession: LocalCommit[] = [];
const pasteBursts: PasteBurstDetail[] = [];

let syncTimer: NodeJS.Timeout | null = null;
let lastSyncedCommitHash = '';

// ─── Plan 3: Session & Event Storage State ───────────────────────────────────
let currentSessionId: string = generateUUID();
let currentBranch = '';
let currentCommitSha = '';
let currentRepoId = '';
let dbInitialized = false;
let globalStoragePath = '';

let sidebarProviderInstance: CollabIntelSidebarProvider | null = null;

// ─── Sensor Instances (Plan 2) ───────────────────────────────────────────────
const diagnosticSensor = new DiagnosticSensor();
const focusSensor = new FocusSensor();
const idleSensor = new IdleSensor();
const documentSensor = new DocumentSensor();

// ─────────────────────────────────────────────────────────────────────────────
//  PROVENANCE & TELEMETRY SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────
function computeLiveProvenance(): CodingProvenanceItem {
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
  if (pastePercent > 50) style = 'Heavy Copy-Paste';
  else if (pastePercent > 15) style = 'Snippet / Reference Pastes';
  else if (aiPercent > 40) style = 'AI-Assisted Development';
  else if (aiPercent > 15) style = 'Balanced Copilot-Assisted';
  else if (manualPercent >= 80) style = 'Authentic Manual Typing';

  return { manualPercent, pastePercent, aiPercent, style };
}

function getTelemetrySnapshot() {
  const cfg = getConfig();
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const now = new Date();
  const durationMinutes = sessionStart ? Math.max(1, Math.round((now.getTime() - sessionStart.getTime()) / 60000)) : 0;
  const offlineSessions: SessionPayload[] = extensionContext?.globalState.get('offline_sessions') || [];
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
    statusState: getStatusState(),
    config: cfg,
    commits: cachedCommitsThisSession,
    workspaceRoot,
    operatingMode: cfg.operatingMode,
    experimentSession: cfg.operatingMode === 'experimental' ? (extensionContext ? getExperimentSession(extensionContext) : null) : null,
    // ── Plan 2 sensor data ──
    saveCount: documentSensor.saveCount,
    fileOpenCount: documentSensor.fileOpenCount,
    diagnosticSummary: diagnosticSensor.getSummary(),
    focusSummary: focusSensor.getSummary(),
    idleSummary: idleSensor.getSummary(),
    pasteBurstCount: pasteBursts.length,
    // ── Plan 3 queue data ──
    queueStatus: dbInitialized ? getQueueStatus(globalStoragePath) : null,
    pendingEventCount: dbInitialized ? getPendingCount() : 0,
    sessionId: currentSessionId,
    // ── Plan 5 & 6 Sliding Window & Performance ──
    latestWindow: defaultSlidingWindowManager.getLatestWindow(),
    recentWindows: defaultSlidingWindowManager.getRecentWindows(),
    performance: getPerformanceStats()
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
  const dashPanel = getActiveDashboardPanel();
  if (dashPanel) {
    dashPanel.webview.postMessage({ type: 'updateState', state: snapshot });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION & GIT CONTEXT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

async function refreshGitContext(workspaceRoot: string): Promise<void> {
  if (!workspaceRoot) return;
  try {
    const [headHash, branch, repoUrl] = await Promise.all([
      getCurrentHeadHash(workspaceRoot),
      getCurrentBranch(workspaceRoot),
      detectRepoRemoteUrl(workspaceRoot)
    ]);
    if (headHash) {
      currentCommitSha = headHash;
      if (!lastSyncedCommitHash) lastSyncedCommitHash = headHash;
    }
    if (branch) currentBranch = branch;
    if (repoUrl) currentRepoId = repoUrl;
  } catch (err: any) {
    console.warn('[CollabIntel] Git context refresh notice:', err.message);
  }
}

function startSession(workspaceRoot: string) {
  sessionStart = new Date();
  currentSessionId = generateUUID(); // New session = new UUID
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

  const cfg = getConfig();
  if (!cfg.authToken || !cfg.assignmentId) {
    updateStatusBar('unconfigured', broadcastStateToWebviews);
  } else {
    updateStatusBar('tracking', broadcastStateToWebviews);
  }
}

async function saveAndSyncSession(context: vscode.ExtensionContext) {
  if (!sessionStart) {
    await flushOfflineCache(context);
    return;
  }

  const cfg = getConfig();
  if (!cfg.authToken || !cfg.assignmentId) {
    updateStatusBar('unconfigured', broadcastStateToWebviews);
    return;
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const sessionEnd = new Date();
  const durationMinutes = Math.max(1, Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000));

  const result = workspaceRoot ? await fetchLocalCommitsSince(workspaceRoot, lastSyncedCommitHash) : { commits: [], latestHash: lastSyncedCommitHash };
  const newCommits = result.commits;
  if (result.latestHash) lastSyncedCommitHash = result.latestHash;
  cachedCommitsThisSession = newCommits;

  const repoRemoteUrl = workspaceRoot ? await detectRepoRemoteUrl(workspaceRoot) : '';

  const activeFolderSet = new Set<string>();
  Array.from(editedFiles).concat(Array.from(createdFiles)).forEach(fp => {
    const dir = path.dirname(fp);
    if (dir && dir !== '.' && dir !== '/' && dir !== '\\') {
      activeFolderSet.add(dir.replace(/\\/g, '/'));
    }
  });

  const payload: SessionPayload = {
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

  updateStatusBar('syncing', broadcastStateToWebviews);

  try {
    const url = `${cfg.serverUrl}/api/vscode/sync`;
    const result = await postJson(url, cfg.authToken, {
      sessions: payload,
      assignmentId: cfg.assignmentId
    });

    if (result.ok) {
      await flushOfflineCache(context);
      updateStatusBar('tracking', broadcastStateToWebviews);
    } else {
      throw new Error(result.data?.error || `HTTP ${result.statusCode || 'Error'}`);
    }
  } catch (err: any) {
    payload.isOffline = true;
    const offline: SessionPayload[] = context.globalState.get('offline_sessions') || [];
    offline.push(payload);
    context.globalState.update('offline_sessions', offline);
    updateStatusBar('error', broadcastStateToWebviews);
  }

  startSession(workspaceRoot);
}

let autoSyncDebounceTimer: NodeJS.Timeout | null = null;
function triggerDebouncedAutoSync(context: vscode.ExtensionContext, delayMs = 2500) {
  if (autoSyncDebounceTimer) clearTimeout(autoSyncDebounceTimer);
  autoSyncDebounceTimer = setTimeout(() => {
    if (sessionStart && (keystrokeCount > 0 || charactersPasted > 0 || aiCharsCount > 0 || editedFiles.size > 0)) {
      saveAndSyncSession(context);
    }
    if (dbInitialized && defaultHealthCheckMonitor.isOnline()) {
      triggerBatchSync({ onStatusUpdate: broadcastStateToWebviews });
    }
  }, delayMs);
}

async function flushOfflineCache(context: vscode.ExtensionContext) {
  const cfg = getConfig();
  if (!cfg.authToken || !cfg.assignmentId) return;

  const offline: SessionPayload[] = context.globalState.get('offline_sessions') || [];
  if (offline.length === 0) return;

  try {
    const url = `${cfg.serverUrl}/api/vscode/sync`;
    const result = await postJson(url, cfg.authToken, {
      sessions: offline,
      assignmentId: cfg.assignmentId
    });

    if (result.ok) {
      context.globalState.update('offline_sessions', []);
      broadcastStateToWebviews();
    }
  } catch {
    // leave cache
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FILE ACTIVITY HELPER
// ─────────────────────────────────────────────────────────────────────────────
function getOrCreateFileActivity(relativePath: string, uri?: vscode.Uri): FileActivityItem {
  let fileItem = fileActivityMap.get(relativePath);
  if (!fileItem) {
    fileItem = {
      filePath: relativePath,
      action: createdFiles.has(relativePath) ? 'created' : 'edited',
      category: uri ? categorizeFile(uri) : 'SOURCE_CODE_EDIT',
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
function storeEvent(
  eventType: EventType,
  category: EventCategory,
  filePath: string,
  payload: Record<string, any>
): void {
  if (!dbInitialized) return;
  profileHook(`storeEvent:${eventType}`, () => {
    try {
      const cfg = getConfig();
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const sanitizedPath = sanitizeFilePath(filePath, workspaceRoot);
      const sanitizedPayload = sanitizePayload(payload, workspaceRoot);
      const studentCheck = verifyStudentIdAnonymization(cfg.assignmentId || 'unknown');

      const expParticipantId = extensionContext?.workspaceState?.get<string>('telemetry_participant_id');
      const expTaskCondition = extensionContext?.workspaceState?.get<string>('telemetry_task_condition');

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

      insertEvent({
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
    } catch (err) {
      console.error('[CollabIntel] Error storing event:', err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVATE & DEACTIVATE
// ─────────────────────────────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  console.log('[CollabIntel] Extension activating with SQLite storage, sensors & filtering...');

  // ── Plan 6: Start Micro-Performance Profiler ───────────────────────────
  startPerformanceProfiler(context, 30000);

  // ── Initialize SQLite Database (Plan 3) ────────────────────────────────
  try {
    globalStoragePath = context.globalStorageUri.fsPath;
    initDatabase(globalStoragePath);
    dbInitialized = true;
    console.log('[CollabIntel] SQLite database ready.');
  } catch (err) {
    console.error('[CollabIntel] Failed to initialize SQLite:', err);
    dbInitialized = false;
  }

  // ── Status Bar ─────────────────────────────────────────────────────────
  createStatusBar(context);

  // ── Sidebar Provider (Plan 6: External HTML & Audit callback) ──────────
  const sidebarProvider = new CollabIntelSidebarProvider(context.extensionUri, {
    getTelemetrySnapshot: () => getTelemetrySnapshot(),
    saveAndSyncSession: () => saveAndSyncSession(context),
    openInteractiveDashboard: (tab?: string) => openDashboard(tab),
    testBackendConnection: () => testBackendConnection(getConfig()),
    viewQueueAudit: () => openAuditWebview(context, globalStoragePath, async () => {
      if (dbInitialized) {
        await triggerBatchSync({ onStatusUpdate: broadcastStateToWebviews });
      }
    })
  });
  sidebarProviderInstance = sidebarProvider;
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('collabintel.sidebarView', sidebarProvider)
  );

  // ── Plan 6: Check Server URL Security (HTTPS enforcement) ──────────────
  const cfg = getConfig();
  if (cfg.serverUrl) {
    checkAndWarnInsecureServerUrl(cfg.serverUrl);
  }
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('collabintel.operatingMode')) {
        refreshStatusBarPendingCount();
        broadcastStateToWebviews();
      }
      if (e.affectsConfiguration('collabintel.serverUrl')) {
        const currentCfg = getConfig();
        if (currentCfg.serverUrl) checkAndWarnInsecureServerUrl(currentCfg.serverUrl);
      }
    })
  );

  // ── Initial Setup & Dual-Mode Check ─────────────────────────────────────
  if (cfg.operatingMode === 'experimental') {
    ensureParticipantSession(context).catch(err => {
      console.warn('[CollabIntel] Experimental onboarding notice:', err);
    });
  } else if (!cfg.authToken || !cfg.assignmentId) {
    updateStatusBar('unconfigured', broadcastStateToWebviews);
    vscode.window.showInformationMessage(
      'CollabIntel [Real Mode]: Setup required to begin tracking your repository.',
      'Open Setup'
    ).then(choice => {
      if (choice === 'Open Setup') openDashboard('setup');
    });
  }

  // ── Start Session ──────────────────────────────────────────────────────
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  if (workspaceRoot) {
    startSession(workspaceRoot);
  }

  // ── Plan 4: Health Check & Batch Telemetry Sync Engine ────────────────
  if (cfg.serverUrl) {
    defaultHealthCheckMonitor.start(cfg.serverUrl, 15000);
    context.subscriptions.push({
      dispose: () => defaultHealthCheckMonitor.stop()
    });
    defaultHealthCheckMonitor.onStatusChange((isOnline) => {
      broadcastStateToWebviews();
    });
  }

  // Trigger initial batch sync if database is ready
  if (dbInitialized) {
    triggerBatchSync({ onStatusUpdate: broadcastStateToWebviews });
  }

  // ── Plan 5: Sliding Window Manager (W=5 min, step=1 min sliding stride) ──
  defaultSlidingWindowManager.start();
  context.subscriptions.push({
    dispose: () => defaultSlidingWindowManager.stop()
  });
  context.subscriptions.push(
    defaultSlidingWindowManager.onWindowComputed(() => {
      broadcastStateToWebviews();
    })
  );

  // ── Dashboard Helper (Plan 6: ML tab & sliding window compute) ─────────
  function openDashboard(tab?: string) {
    openInteractiveDashboard(context, {
      getTelemetrySnapshot: () => getTelemetrySnapshot(),
      saveAndSyncSession: () => saveAndSyncSession(context),
      testBackendConnection: (cfg) => testBackendConnection(cfg),
      updateStatusBar: (state: StatusState) => updateStatusBar(state, broadcastStateToWebviews),
      startSession: (root: string) => startSession(root),
      getConfig: () => getConfig(),
      computeSlidingWindow: () => {
        const win = defaultSlidingWindowManager.computeCurrentWindow();
        broadcastStateToWebviews();
        return win;
      },
      viewQueueAudit: () => openAuditWebview(context, globalStoragePath, async () => {
        if (dbInitialized) {
          await triggerBatchSync({ onStatusUpdate: broadcastStateToWebviews });
        }
      })
    }, tab || 'overview');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SENSOR REGISTRATION (Plan 2)
  // ══════════════════════════════════════════════════════════════════════

  // ── Diagnostic Sensor ──────────────────────────────────────────────────
  diagnosticSensor.register(context, () => {
    profileHook('sensor:diagnostic', () => broadcastStateToWebviews());
  });

  // ── Focus Sensor (replaces old onDidChangeActiveTextEditor handler) ────
  focusSensor.register(
    context,
    () => {
      profileHook('sensor:focusActivity', () => {
        lastActivityTime = Date.now();
        idleSensor.reportActivity();
        if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
      });
    },
    () => {
      profileHook('sensor:focusUpdate', () => broadcastStateToWebviews());
    }
  );

  // ── Idle Sensor ────────────────────────────────────────────────────────
  idleSensor.start((newState) => {
    if (newState === 'IDLE' && sessionStart) {
      saveAndSyncSession(context).then(() => {
        updateStatusBar('idle', broadcastStateToWebviews);
        sessionStart = null;
      });
    }
  });

  // ── Document Sensor (file opens + save tracking) ───────────────────────
  documentSensor.register(
    context,
    () => {
      profileHook('sensor:documentActivity', () => {
        lastActivityTime = Date.now();
        idleSensor.reportActivity();
        if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
      });
    },
    () => {
      profileHook('sensor:documentUpdate', () => broadcastStateToWebviews());
    }
  );

  // ══════════════════════════════════════════════════════════════════════
  //  EVENT HANDLERS (enhanced with noise filtering & sensors)
  // ══════════════════════════════════════════════════════════════════════

  // ── Text Document Change Handler (Keystroke / Paste / AI Detection) ────
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async event => {
    if (event.document.uri.scheme !== 'file') return;
    // Use shouldTrackEdit: checks blacklist + lockfile + active tab validation
    if (!shouldTrackEdit(event.document.uri)) return;

    const now = Date.now();
    const timeDelta = lastActivityTime > 0 ? (now - lastActivityTime) : 150;
    lastActivityTime = now;
    idleSensor.reportActivity();
    if (!sessionStart && workspaceRoot) startSession(workspaceRoot);

    const relativePath = vscode.workspace.asRelativePath(event.document.uri, false).replace(/\\/g, '/');
    editedFiles.add(relativePath);

    const fileItem = getOrCreateFileActivity(relativePath, event.document.uri);

    // Read OS clipboard as the gold standard paste signal
    let clipboardText = '';
    try {
      clipboardText = await vscode.env.clipboard.readText();
    } catch {
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

      if (textLen === 0) continue; // pure deletion, no insertion

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
      const normEndings = (s: string) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const clipNorm = normEndings(clipboardText);
      const textNorm = normEndings(text);
      const clipTrimmed = clipNorm.trim();
      const textTrimmed = textNorm.trim();

      // Whitespace-agnostic comparison for indented or reformatted code pastes
      const stripWs = (s: string) => s.replace(/\s+/g, '');
      const clipWs = stripWs(clipNorm);
      const textWs = stripWs(textNorm);
      const isWsMatch = clipWs.length > 0 && textWs.length > 0 && (
        clipWs === textWs ||
        clipWs.includes(textWs) ||
        textWs.includes(clipWs)
      );

      // Line-by-line overlap comparison for multi-line pastes
      const clipLines = clipNorm.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
      const textLines = textNorm.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
      const hasSharedLines = textLines.length > 0 && textLines.some(tl => clipLines.some(cl => cl === tl || cl.includes(tl) || tl.includes(cl)));

      const isClipboardMatch = (clipTrimmed.length > 0 && textTrimmed.length > 0 && (
        textNorm === clipNorm ||
        textTrimmed === clipTrimmed ||
        clipNorm.startsWith(textNorm) ||
        clipTrimmed.startsWith(textTrimmed) ||
        (textTrimmed.length >= 2 && clipTrimmed.includes(textTrimmed)) ||
        (clipTrimmed.length >= 2 && textTrimmed.includes(clipTrimmed))
      )) || isWsMatch || (textLines.length > 1 && hasSharedLines);

      // AI AGENT vs USER PASTE vs MANUAL TYPING SIGNALS:
      const lines = text.split(/\r?\n/);
      const nonEmptyLines = lines.filter(l => l.trim().length > 0);
      const isMultiLine = nonEmptyLines.length > 1;

      // Realistic human typing patterns:
      // A single keystroke produces 1 char, Enter (\n or \r\n), tab/indent (1-4 spaces), auto-close pair, or word completion (< 20 chars)
      const isSingleKey = textLen === 1;
      const isEnterKey = text === '\n' || text === '\r\n';
      const isTabOrIndent = /^\s{1,4}$/.test(text);
      const isAutoClosePair = /^(\(\)|\[\]|\{\}|""|''|``|<>)$/.test(text);
      const isWordTyping = textLen <= 20 && !text.includes('\n') && !isClipboardMatch;
      const isPlausibleKeystroke = (isSingleKey || isEnterKey || isTabOrIndent || isAutoClosePair || isWordTyping) && !isClipboardMatch;

      // AI assistant code generation check:
      // Explicit AI conversational comments, Copilot markers, AI signatures
      const isAiExplicitSignature = (
        /\/\/\s*(here('?s| is)|generated (by|with)|auto-?generated|ai[- ]assistant|copilot|chatgpt|claude|gemini|openai|step \d+:|helper function to|implementation of)/i.test(text) ||
        /\/\*\s*(auto-?generated|generated by ai|ai assistant)/i.test(text) ||
        /```(?:js|javascript|ts|typescript|python|py)?/i.test(text)
      );

      let lineProvenance: 'manual' | 'ai_assisted' | 'copy_paste' = 'manual';

      // 1. Explicit AI Assistant code generation
      if (isAiExplicitSignature) {
        aiEventsCount++;
        aiCharsCount += textLen;
        fileItem.aiEvents++;
        fileItem.aiChars += textLen;
        lineProvenance = 'ai_assisted';

        // Store AI event to SQLite
        storeEvent('KEYSTROKE', fileItem.category, relativePath, {
          provenance: 'ai_assisted',
          action: 'ai_assistant_code_generation',
          charCount: textLen,
          lineCount: added
        });
        idleSensor.reportActivity();
      }
      // 2. User Clipboard Paste
      else if (isClipboardMatch || isMultiLine || textLen >= 25) {
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
      if (!fileItem.lineRecords) fileItem.lineRecords = [];
      const startLineNum = change.range.start.line + 1;
      const insertedLines = text.split('\n');
      const timeIso = new Date().toISOString();
      const isCurrentlyOffline = getStatusState() === 'error';

      const records = fileItem.lineRecords;
      insertedLines.forEach((lText, lIdx) => {
        const lNum = startLineNum + lIdx;
        const lineRec: LineProvenanceRecord = {
          lineNumber: lNum,
          lineText: lText.slice(0, 120),
          provenance: lineProvenance,
          isOffline: isCurrentlyOffline,
          timestamp: timeIso
        };
        const existIdx = records.findIndex(r => r.lineNumber === lNum);
        if (existIdx >= 0) {
          records[existIdx] = lineRec;
        } else {
          records.push(lineRec);
        }
      });

      // Re-evaluate file-level typingProvenance
      const fTotal = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
      if (fTotal > 0) {
        const aiRatioFile   = fileItem.aiChars / fTotal;
        const pasteRatioFile = fileItem.pasteChars / fTotal;
        const manualRatioFile = fileItem.manualChars / fTotal;
        if (aiRatioFile > 0.40) fileItem.typingProvenance = 'ai_assisted';
        else if (pasteRatioFile > 0.20 || (fileItem.pasteEvents > 0 && pasteRatioFile > 0.10)) fileItem.typingProvenance = 'copy_paste';
        else if (manualRatioFile >= 0.70) fileItem.typingProvenance = 'manual';
        else fileItem.typingProvenance = 'mixed';
      }
    }

    broadcastStateToWebviews();
    triggerDebouncedAutoSync(context, 1500);
  }));

  // ── File Create Handler ────────────────────────────────────────────────
  context.subscriptions.push(vscode.workspace.onDidCreateFiles(event => {
    event.files.forEach(f => {
      if (!shouldTrackFile(f)) return;
      lastActivityTime = Date.now();
      idleSensor.reportActivity();
      if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
      const rel = vscode.workspace.asRelativePath(f, false).replace(/\\/g, '/');
      storeEvent('FILE_CREATE', categorizeFile(f), rel, { action: 'created' });
      try {
        if (fs.existsSync(f.fsPath) && fs.statSync(f.fsPath).isDirectory()) {
          createdFolders.add(rel);
        } else {
          createdFiles.add(rel);
          const fileItem = getOrCreateFileActivity(rel, f);
          fileItem.action = 'created';
        }
      } catch {
        createdFiles.add(rel);
      }
    });
    broadcastStateToWebviews();
    triggerDebouncedAutoSync(context, 1000);
  }));

  // ── File Delete Handler ────────────────────────────────────────────────
  context.subscriptions.push(vscode.workspace.onDidDeleteFiles(event => {
    event.files.forEach(f => {
      if (!shouldTrackFile(f)) return;
      lastActivityTime = Date.now();
      idleSensor.reportActivity();
      if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
      const rel = vscode.workspace.asRelativePath(f, false).replace(/\\/g, '/');
      storeEvent('FILE_DELETE', categorizeFile(f), rel, { action: 'deleted' });
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
  bgWatcher.onDidChange(async uri => {
    if (uri.scheme !== 'file' || !shouldTrackFile(uri)) return;
    const fsPath = uri.fsPath;
    const isActivelyOpen = vscode.window.activeTextEditor?.document.uri.fsPath === fsPath;
    if (!isActivelyOpen) {
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
        } catch {}
        const lines = content ? content.split(/\r?\n/) : [];
        const newDocLen = content.length;
        const loggedChars = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
        const deltaChars = Math.max(0, newDocLen - loggedChars);
        const mtimeIso = new Date(stats.mtimeMs).toISOString();
        if (!fileItem.lineRecords) fileItem.lineRecords = [];

        let hasExplicitAi = false;
        lines.forEach((lineText, idx) => {
          const lNum = idx + 1;
          const exist = fileItem.lineRecords!.find(r => r.lineNumber === lNum);
          const trimmed = lineText.trim();
          const isAiLine = /^\/\/\s*(here('?s| is)|generated (by|with)|auto-?generated|ai[- ]assistant|copilot|chatgpt|claude|gemini|openai|step \d+:|helper function to)/i.test(trimmed) ||
                           /^\/\*\s*(auto-?generated|generated by ai)/i.test(trimmed);
          const isImportLine = /^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed) || /^(import\s+|const\s+.*require)/.test(trimmed);
          if (isAiLine) hasExplicitAi = true;
          const defaultProv: 'manual' | 'copy_paste' | 'ai_assisted' = isAiLine ? 'ai_assisted' : isImportLine ? 'copy_paste' : 'manual';

          if (!exist) {
            fileItem.lineRecords!.push({
              lineNumber: lNum,
              lineText: lineText.slice(0, 120),
              provenance: defaultProv,
              isOffline: false,
              timestamp: mtimeIso
            });
          } else if (exist.lineText !== lineText.slice(0, 120)) {
            exist.lineText = lineText.slice(0, 120);
            if (isAiLine) exist.provenance = 'ai_assisted';
            exist.timestamp = mtimeIso;
          }
        });

        if (hasExplicitAi) {
          fileItem.aiChars += deltaChars;
          fileItem.aiEvents += 1;
          fileItem.typingProvenance = 'ai_assisted';
          aiCharsCount += deltaChars;
          aiEventsCount += 1;
        } else {
          fileItem.manualChars += deltaChars;
          fileItem.manualKeystrokes += Math.round(deltaChars * 0.9);
          keystrokeCount += Math.round(deltaChars * 0.9);
        }
        fileItem.linesAdded = Math.max(fileItem.linesAdded, lines.length);

        storeEvent('KEYSTROKE', categorizeFile(uri), rel, {
          provenance: hasExplicitAi ? 'ai_assisted' : 'manual',
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
      } catch {}
    }
  });

  bgWatcher.onDidCreate(async uri => {
    if (uri.scheme !== 'file' || !shouldTrackFile(uri)) return;
    const fsPath = uri.fsPath;
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
      } catch {}
      const lines = content ? content.split(/\r?\n/) : [];
      const docLen = content.length;

      // Classify lines intelligently based on content characteristics
      if (docLen > 0 && fileItem.manualKeystrokes === 0) {
        const mtimeIso = new Date(stats.mtimeMs).toISOString();
        let aiLineCount = 0;
        let pasteLineCount = 0;
        let manualLineCount = 0;

        fileItem.lineRecords = lines.map((lineText, idx) => {
          const trimmed = lineText.trim();
          const isAi = /^\/\/\s*(here('?s| is)|generated (by|with)|auto-?generated|ai[- ]assistant|copilot|chatgpt|claude|gemini|openai|step \d+:|helper function to)/i.test(trimmed) ||
                       /^\/\*\s*(auto-?generated|generated by ai)/i.test(trimmed);
          const isImport = /^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed) || /^(import\s+|const\s+.*require)/.test(trimmed);
          const p: 'manual' | 'copy_paste' | 'ai_assisted' = isAi ? 'ai_assisted' : isImport ? 'copy_paste' : 'manual';
          if (p === 'ai_assisted') aiLineCount++;
          else if (p === 'copy_paste') pasteLineCount++;
          else manualLineCount++;
          return {
            lineNumber: idx + 1,
            lineText: lineText.slice(0, 120),
            provenance: p,
            isOffline: false,
            timestamp: mtimeIso
          };
        });

        fileItem.linesAdded = lines.length;
        linesAddedCount += lines.length;

        if (aiLineCount > 0 && aiLineCount >= manualLineCount) {
          fileItem.aiChars = docLen;
          fileItem.aiEvents = Math.max(1, fileItem.aiEvents);
          fileItem.typingProvenance = 'ai_assisted';
          aiCharsCount += docLen;
          aiEventsCount += 1;
        } else if (pasteLineCount > 0 && pasteLineCount >= manualLineCount) {
          fileItem.pasteChars = docLen;
          fileItem.pasteEvents = Math.max(1, fileItem.pasteEvents);
          fileItem.typingProvenance = 'copy_paste';
          charactersPasted += docLen;
          pasteCount += 1;
        } else {
          fileItem.manualChars = docLen;
          fileItem.manualKeystrokes = Math.round(docLen * 0.9);
          fileItem.typingProvenance = 'manual';
          keystrokeCount += Math.round(docLen * 0.9);
        }

        storeEvent('FILE_CREATE', categorizeFile(uri), rel, {
          provenance: fileItem.typingProvenance,
          action: fileItem.typingProvenance === 'ai_assisted' ? 'ai_assistant_file_create' : 'file_create',
          isExternalDiskWrite: true,
          charCount: docLen,
          sizeBytes: stats.size,
          mtimeMs: stats.mtimeMs,
          description: fileItem.typingProvenance === 'ai_assisted' ? 'New file created by AI assistant' : 'New file created'
        });

        broadcastStateToWebviews();
        triggerDebouncedAutoSync(context, 1000);
      }
    } catch {}
  });

  context.subscriptions.push(bgWatcher);

  // ── Save Handler (enhanced with save count) ────────────────────────────
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.uri.scheme !== 'file') return;
    if (!shouldTrackFile(doc.uri)) return;
    lastActivityTime = Date.now();
    idleSensor.reportActivity();
    if (!sessionStart && workspaceRoot) startSession(workspaceRoot);

    // Track save count via document sensor
    documentSensor.recordSave();

    const rel = vscode.workspace.asRelativePath(doc.uri, false).replace(/\\/g, '/');
    storeEvent('SAVE', categorizeFile(doc.uri), rel, { lineCount: doc.lineCount, charCount: doc.getText().length });
    let fileItem = fileActivityMap.get(rel);
    const docLen = doc.getText().length;
    const lineCount = doc.lineCount;

    // Detect file content that appeared without any keyboard/clipboard telemetry
    if (!fileItem) {
      fileItem = {
        filePath: rel,
        action: 'edited',
        category: categorizeFile(doc.uri),
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
    } else {
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
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(path.join(workspaceRoot, '.git'), 'COMMIT_EDITMSG'),
        false, false, true
      );

      watcher.onDidChange(async () => {
        lastActivityTime = Date.now();
        idleSensor.reportActivity();
        if (!sessionStart) startSession(workspaceRoot);
        await refreshGitContext(workspaceRoot);
        storeEvent('GIT_COMMIT', 'SYSTEM', '', { action: 'commit_detected', branch: currentBranch, commit_sha: currentCommitSha });
        vscode.window.setStatusBarMessage('$(sync~spin) CollabIntel: Git commit detected, syncing...', 4000);
        await saveAndSyncSession(context);
      });

      context.subscriptions.push(watcher);

      // Watch .git/HEAD for branch switching
      const headWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(path.join(workspaceRoot, '.git'), 'HEAD'),
        false, false, true
      );
      headWatcher.onDidChange(async () => {
        await refreshGitContext(workspaceRoot);
      });
      context.subscriptions.push(headWatcher);
    }
  }

  // ── Periodic Sync Timer ────────────────────────────────────────────────
  const { syncIntervalMinutes } = getConfig();
  const syncMs = Math.max(1, syncIntervalMinutes) * 60 * 1000;
  syncTimer = setInterval(() => {
    if (sessionStart) {
      saveAndSyncSession(context);
    } else {
      flushOfflineCache(context);
    }
  }, syncMs);

  // ── Command Registration ───────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.setup', () => openDashboard('setup'))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.openDashboard', () => openDashboard('overview'))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.sync', async () => {
      await saveAndSyncSession(context);
      if (dbInitialized) {
        await triggerBatchSync({ onStatusUpdate: broadcastStateToWebviews });
      }
      vscode.window.showInformationMessage('CollabIntel: Telemetry synced.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.reconcile', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      if (!root) {
        vscode.window.showWarningMessage('No active workspace folder to reconcile.');
        return;
      }
      try {
        const { commits } = await fetchLocalCommitsSince(root, '');
        const lookbackMs = 24 * 60 * 60 * 1000;
        const events = queryEventsByTimeRange(Date.now() - lookbackMs, Date.now());
        const results = reconcileEventsWithCommits(events, commits);
        const matched = results.filter(r => r.matchedCommit).length;
        vscode.window.showInformationMessage(
          `CollabIntel: Reconciled ${results.length} sessions (${matched} matched to Git commits).`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Reconciliation error: ${err.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.testConnection', async () => {
      const res = await testBackendConnection(getConfig());
      if (res.success) vscode.window.showInformationMessage(`CollabIntel: ${res.message}`);
      else vscode.window.showErrorMessage(`CollabIntel: ${res.message}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.status', () => openDashboard('overview'))
  );

  context.subscriptions.push(
    registerAuditViewerCommand(context, globalStoragePath, async () => {
      if (dbInitialized) {
        await triggerBatchSync({ onStatusUpdate: broadcastStateToWebviews });
      }
    })
  );

  // ── Volunteer Experiment & Offline Export Commands (Phase 1) ───────────
  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.switchMode', async () => {
      await switchOperatingMode(context, () => {
        refreshStatusBarPendingCount();
        broadcastStateToWebviews();
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.setupParticipant', () => reconfigureParticipant(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.switchTask', () => switchTaskCondition(context))
  );

  // 1-Click offline failsafe exporter
  registerExportCommand(context, globalStoragePath);

  // ── Flush Offline Cache on Startup ─────────────────────────────────────
  flushOfflineCache(context);

  // ── Prune old synced records (7-day retention) ─────────────────────────
  if (dbInitialized) {
    try {
      const pruned = pruneOldRecords();
      if (pruned > 0) console.log(`[CollabIntel] Pruned ${pruned} old synced events.`);
    } catch (err) {
      console.error('[CollabIntel] Error pruning old records:', err);
    }
  }

  console.log('[CollabIntel] Extension with SQLite storage, sensors & filtering activated.');
}

export function deactivate() {
  if (syncTimer) clearInterval(syncTimer);
  stopPerformanceProfiler();
  defaultHealthCheckMonitor.stop();
  defaultSlidingWindowManager.stop();
  idleSensor.dispose();
  diagnosticSensor.dispose();
  focusSensor.dispose();
  documentSensor.dispose();

  // Close SQLite database gracefully (Plan 3)
  if (dbInitialized) {
    closeDatabase();
    dbInitialized = false;
  }
}
