import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────────
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
  manualChars: number;
  pasteChars: number;
  aiChars: number;
  manualKeystrokes: number;
  pasteEvents: number;
  aiEvents: number;
  typingProvenance: 'manual' | 'ai_assisted' | 'copy_paste' | 'mixed';
  linesAdded: number;
  linesRemoved: number;
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

interface SessionPayload {
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
}

interface LocalCommit {
  hash: string;
  message: string;
  date: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

interface ExtConfig {
  authToken: string;
  assignmentId: string;
  serverUrl: string;
  syncIntervalMinutes: number;
  trackOnlyLinkedRepo: boolean;
}

export type StatusState = 'tracking' | 'idle' | 'syncing' | 'error' | 'unconfigured';

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
const editedFiles = new Set<string>();
const createdFiles = new Set<string>();
const deletedFiles = new Set<string>();
const createdFolders = new Set<string>();
const deletedFolders = new Set<string>();
const fileActivityMap = new Map<string, FileActivityItem>();
let cachedCommitsThisSession: LocalCommit[] = [];

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle → pause session

let syncTimer: NodeJS.Timeout | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let statusBarItem: vscode.StatusBarItem;
let lastSyncedCommitHash = '';
let currentStatusState: StatusState = 'unconfigured';

let sidebarProviderInstance: CollabIntelSidebarProvider | null = null;
let activeDashboardPanel: vscode.WebviewPanel | null = null;

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS – CONFIG & GIT
// ─────────────────────────────────────────────────────────────────────────────
function getConfig(): ExtConfig {
  const cfg = vscode.workspace.getConfiguration('collabintel');
  return {
    authToken: cfg.get<string>('authToken') || '',
    assignmentId: cfg.get<string>('assignmentId') || '',
    serverUrl: (cfg.get<string>('serverUrl') || 'http://localhost:5000').replace(/\/+$/, ''),
    syncIntervalMinutes: cfg.get<number>('syncIntervalMinutes') || 5,
    trackOnlyLinkedRepo: cfg.get<boolean>('trackOnlyLinkedRepo') ?? true,
  };
}

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    child_process.exec(`git ${args.join(' ')}`, { cwd, timeout: 10000 }, (err, stdout) => {
      if (err) resolve('');
      else resolve(stdout.trim());
    });
  });
}

async function detectRepoRemoteUrl(workspaceRoot: string): Promise<string> {
  return runGit(['remote', 'get-url', 'origin'], workspaceRoot);
}

async function fetchLocalCommitsSince(workspaceRoot: string, sinceHash: string): Promise<LocalCommit[]> {
  const format = '--format=%H|||%s|||%ai|||%h';
  const range = sinceHash ? `${sinceHash}..HEAD` : '-20';
  const logRaw = await runGit(['log', sinceHash ? range : '', format, '-n', '30'], workspaceRoot);

  if (!logRaw) return [];

  const commits: LocalCommit[] = [];
  const lines = logRaw.split('\n').filter(l => l.includes('|||'));

  for (const line of lines) {
    const [hash, message, date] = line.split('|||');
    if (!hash || hash.length < 7) continue;

    const statLine = await runGit(['show', '--stat', '--format=', hash.trim()], workspaceRoot);
    let filesChanged = 0, insertions = 0, deletions = 0;

    const summaryMatch = statLine.match(/(\d+) file.*?(\d+) insertion.*?(\d+) deletion/);
    if (summaryMatch) {
      filesChanged = parseInt(summaryMatch[1], 10) || 0;
      insertions = parseInt(summaryMatch[2], 10) || 0;
      deletions = parseInt(summaryMatch[3], 10) || 0;
    } else {
      const fMatch = statLine.match(/(\d+) file/);
      if (fMatch) filesChanged = parseInt(fMatch[1], 10) || 0;
      const iMatch = statLine.match(/(\d+) insertion/);
      if (iMatch) insertions = parseInt(iMatch[1], 10) || 0;
      const dMatch = statLine.match(/(\d+) deletion/);
      if (dMatch) deletions = parseInt(dMatch[1], 10) || 0;
    }

    commits.push({
      hash: hash.trim(),
      message: message?.trim() || '',
      date: date?.trim() || new Date().toISOString(),
      filesChanged,
      insertions,
      deletions
    });
  }

  if (commits.length > 0) {
    lastSyncedCommitHash = commits[0].hash;
  }

  cachedCommitsThisSession = commits;
  return commits;
}

async function getCurrentHeadHash(workspaceRoot: string): Promise<string> {
  return runGit(['rev-parse', 'HEAD'], workspaceRoot);
}

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP API & CONNECTION TESTING
// ─────────────────────────────────────────────────────────────────────────────
function postJson(url: string, token: string, body: object): Promise<{ ok: boolean; data: any; statusCode?: number }> {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${token}`
      }
    };

    const lib = isHttps ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: (res.statusCode || 500) < 400, data: parsed, statusCode: res.statusCode });
        } catch {
          resolve({ ok: (res.statusCode || 500) < 400, data: {}, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, data: { error: err.message } }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, data: { error: 'Request timeout' } }); });
    req.write(payload);
    req.end();
  });
}

async function testBackendConnection(cfg: ExtConfig): Promise<{ success: boolean; message: string }> {
  if (!cfg.serverUrl) return { success: false, message: 'Server URL is empty.' };
  if (!cfg.authToken) return { success: false, message: 'Auth Token is missing.' };
  if (!cfg.assignmentId) return { success: false, message: 'Assignment ID is missing.' };

  const url = `${cfg.serverUrl}/api/vscode/sync`;
  const result = await postJson(url, cfg.authToken, {
    ping: true,
    assignmentId: cfg.assignmentId
  });

  if (result.ok) {
    return { success: true, message: `Connected successfully! Server acknowledged authentication at ${cfg.serverUrl}` };
  } else {
    const errorMsg = result.data?.error || `HTTP ${result.statusCode || 'Connection Failed'}`;
    return { success: false, message: `Connection failed: ${errorMsg}` };
  }
}

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
  else if (aiPercent > 40) style = 'AI-Assisted Development';
  else if (aiPercent > 15) style = 'Balanced Copilot-Assisted';
  else if (manualPercent >= 80) style = 'Authentic Manual Typing';

  return { manualPercent, pastePercent, aiPercent, style };
}

// ─────────────────────────────────────────────────────────────────────────────
//  TELEMETRY SNAPSHOT & WEBVIEW BROADCASTING
// ─────────────────────────────────────────────────────────────────────────────
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
    statusState: currentStatusState,
    config: cfg,
    commits: cachedCommitsThisSession,
    workspaceRoot
  };
}

function broadcastStateToWebviews() {
  const snapshot = getTelemetrySnapshot();
  if (sidebarProviderInstance) {
    sidebarProviderInstance.postMessage({ type: 'updateState', state: snapshot });
  }
  if (activeDashboardPanel) {
    activeDashboardPanel.webview.postMessage({ type: 'updateState', state: snapshot });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION & STATUS BAR MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
function updateStatusBar(state: StatusState) {
  currentStatusState = state;
  if (!statusBarItem) return;
  switch (state) {
    case 'tracking':
      statusBarItem.text = '$(record) CollabIntel: Live';
      statusBarItem.tooltip = 'CollabIntel is actively tracking your session. Click to open UI dashboard.';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'idle':
      statusBarItem.text = '$(circle-outline) CollabIntel: Idle';
      statusBarItem.tooltip = 'No recent activity detected. Start coding to resume.';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'syncing':
      statusBarItem.text = '$(sync~spin) CollabIntel: Syncing...';
      statusBarItem.tooltip = 'Syncing telemetry to CollabIntel server...';
      break;
    case 'error':
      statusBarItem.text = '$(error) CollabIntel: Sync Error';
      statusBarItem.tooltip = 'Telemetry sync failed. Offline sessions buffered.';
      break;
    case 'unconfigured':
      statusBarItem.text = '$(warning) CollabIntel: Setup Needed';
      statusBarItem.tooltip = 'Click to configure CollabIntel credentials and assignment.';
      break;
  }
  statusBarItem.show();
  broadcastStateToWebviews();
}

function startSession(workspaceRoot: string) {
  sessionStart = new Date();
  keystrokeCount = 0;
  linesAddedCount = 0;
  linesRemovedCount = 0;
  pasteCount = 0;
  charactersPasted = 0;
  aiCharsCount = 0;
  aiEventsCount = 0;
  editedFiles.clear();
  createdFiles.clear();
  deletedFiles.clear();
  createdFolders.clear();
  deletedFolders.clear();
  fileActivityMap.clear();
  cachedCommitsThisSession = [];
  lastActivityTime = Date.now();

  getCurrentHeadHash(workspaceRoot).then(hash => {
    if (hash) lastSyncedCommitHash = hash;
  });

  const cfg = getConfig();
  if (!cfg.authToken || !cfg.assignmentId) {
    updateStatusBar('unconfigured');
  } else {
    updateStatusBar('tracking');
  }
}

async function saveAndSyncSession(context: vscode.ExtensionContext) {
  if (!sessionStart) {
    await flushOfflineCache(context);
    return;
  }

  const cfg = getConfig();
  if (!cfg.authToken || !cfg.assignmentId) {
    updateStatusBar('unconfigured');
    return;
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const sessionEnd = new Date();
  const durationMinutes = Math.max(1, Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000));

  const newCommits = workspaceRoot ? await fetchLocalCommitsSince(workspaceRoot, lastSyncedCommitHash) : [];
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
    charactersPasted
  };

  updateStatusBar('syncing');

  try {
    const url = `${cfg.serverUrl}/api/vscode/sync`;
    const result = await postJson(url, cfg.authToken, {
      sessions: payload,
      assignmentId: cfg.assignmentId
    });

    if (result.ok) {
      await flushOfflineCache(context);
      updateStatusBar('tracking');
    } else {
      throw new Error(result.data?.error || `HTTP ${result.statusCode || 'Error'}`);
    }
  } catch (err: any) {
    payload.isOffline = true;
    const offline: SessionPayload[] = context.globalState.get('offline_sessions') || [];
    offline.push(payload);
    context.globalState.update('offline_sessions', offline);
    updateStatusBar('error');
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

function isInsideWorkspace(uri: vscode.Uri): boolean {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return false;
  return folders.some(f => uri.fsPath.startsWith(f.uri.fsPath));
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR WEBVIEW VIEW PROVIDER (ULTRA-RICH DESIGN)
// ─────────────────────────────────────────────────────────────────────────────
class CollabIntelSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    sidebarProviderInstance = this;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'requestState':
          this.postMessage({ type: 'updateState', state: getTelemetrySnapshot() });
          break;
        case 'syncNow':
          await saveAndSyncSession(extensionContext);
          vscode.window.showInformationMessage('✅ CollabIntel: Telemetry sync initiated.');
          break;
        case 'openDashboard':
          openInteractiveDashboard(extensionContext);
          break;
        case 'testConnection':
          const cfg = getConfig();
          const testRes = await testBackendConnection(cfg);
          if (testRes.success) vscode.window.showInformationMessage(`✅ ${testRes.message}`);
          else vscode.window.showErrorMessage(`❌ ${testRes.message}`);
          break;
        case 'openSetup':
          openInteractiveDashboard(extensionContext, 'setup');
          break;
      }
    });

    setTimeout(() => {
      this.postMessage({ type: 'updateState', state: getTelemetrySnapshot() });
    }, 200);
  }

  public postMessage(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CollabIntel Sidebar</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      padding: 14px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--vscode-foreground, #e2e8f0);
      background-color: var(--vscode-sideBar-background, #0f172a);
      font-size: 12px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.08));
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: -0.3px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand svg {
      width: 18px;
      height: 18px;
      color: #6366f1;
    }
    
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .status-tracking { background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); box-shadow: 0 0 12px rgba(16, 185, 129, 0.2); }
    .status-idle { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .status-syncing { background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }
    .status-error { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-unconfigured { background: rgba(249, 115, 22, 0.12); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.3); }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }
    .pulse-dot.anim {
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.3; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.2); }
      100% { opacity: 0.3; transform: scale(0.9); }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 10px 12px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .stat-card:hover {
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    .stat-label {
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #94a3b8);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 800;
      font-feature-settings: "cv02", "cv03", "cv04", "cv11";
      font-variant-numeric: tabular-nums;
    }
    .val-green { color: #10b981; }
    .val-red { color: #f43f5e; }

    .btn {
      width: 100%;
      padding: 9px 14px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
      transition: all 0.2s ease;
    }
    .prov-container {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .prov-bar {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
      background: rgba(255, 255, 255, 0.05);
    }
    .prov-seg-manual { background: #38bdf8; }
    .prov-seg-ai { background: #818cf8; }
    .prov-seg-paste { background: #f43f5e; }
    .prov-legend {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
    .file-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 6px 8px;
      margin-bottom: 5px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .file-path {
      font-family: monospace;
      font-size: 10px;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .prov-badge {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      font-weight: 700;
    }
    .prov-badge-manual { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .prov-badge-ai_assisted { background: rgba(129, 140, 248, 0.15); color: #818cf8; border: 1px solid rgba(129, 140, 248, 0.3); }
    .prov-badge-copy_paste { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
    .prov-badge-mixed { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--vscode-foreground, #e2e8f0);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: none;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--vscode-descriptionForeground, #94a3b8);
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .commit-item {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 6px;
      font-size: 11px;
      transition: border-color 0.2s;
    }
    .commit-item:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
    .commit-msg {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--vscode-foreground, #f1f5f9);
    }
    .commit-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #64748b);
      margin-top: 4px;
      font-family: monospace;
    }
    .badge-offline {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 12px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span>CollabIntel</span>
    </div>
    <div id="statusPill" class="status-pill status-unconfigured">
      <div id="pulseDot" class="pulse-dot"></div>
      <span id="statusText">Checking</span>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Active Time</div>
      <div class="stat-value" id="statTime">0m</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Keystrokes</div>
      <div class="stat-value" id="statKeys">0</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Lines Added</div>
      <div class="stat-value val-green" id="statAdded">+0</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Lines Removed</div>
      <div class="stat-value val-red" id="statRemoved">-0</div>
    </div>
  </div>

  <!-- Live Coding Provenance Section -->
  <div class="prov-container">
    <div class="stat-label" style="display:flex; justify-content:space-between;">
      <span>Coding Provenance</span>
      <span id="provStyleText" style="color:#38bdf8; text-transform:none;">Manual Typing</span>
    </div>
    <div class="prov-bar">
      <div id="provBarManual" class="prov-seg-manual" style="width: 100%;"></div>
      <div id="provBarAi" class="prov-seg-ai" style="width: 0%;"></div>
      <div id="provBarPaste" class="prov-seg-paste" style="width: 0%;"></div>
    </div>
    <div class="prov-legend">
      <span>✍️ <span id="provManPct">100%</span> Manual</span>
      <span>🤖 <span id="provAiPct">0%</span> AI</span>
      <span>📋 <span id="provPastePct">0%</span> Paste</span>
    </div>
  </div>

  <!-- Continuous Background Auto-Tracker Banner -->
  <div class="auto-tracker-card" style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
      <span style="font-size: 11px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
        <span class="pulse-dot anim" style="background:#10b981; width:7px; height:7px; border-radius:50%; display:inline-block;"></span>
        Automatic Live Tracker
      </span>
      <span id="autoSyncModeText" style="font-size: 9px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1px 6px; border-radius: 8px;">Online Live</span>
    </div>
    <div style="font-size: 10px; color: #94a3b8; line-height: 1.4;">
      Automatically streaming keystrokes, AST edits, file locations & typing provenance as you type (buffered offline if disconnected).
    </div>
  </div>

  <button class="btn btn-secondary" onclick="postCmd('openDashboard')">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
    Open Full Dashboard
  </button>
  <button class="btn btn-secondary" onclick="postCmd('testConnection')">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v8M18 10l-6 6-6-6M12 16v6"/></svg>
    Test Connection
  </button>

  <!-- Tracked File Locations -->
  <div class="section-title">
    <span>Tracked File Locations</span>
    <span id="filesCountBadge" style="color:#38bdf8; font-size:10px;">0 files</span>
  </div>
  <div id="fileActivitiesList">
    <div style="color:var(--vscode-descriptionForeground, #64748b); font-style:italic; padding:4px 0;">No modified files yet.</div>
  </div>

  <div class="section-title">
    <span>Session Commits</span>
    <span id="offlineBadge" class="badge-offline" style="display:none">0 queued</span>
  </div>
  <div id="commitsList">
    <div style="color:var(--vscode-descriptionForeground, #64748b); font-style:italic; padding:4px 0;">No commits recorded yet.</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function postCmd(command) {
      vscode.postMessage({ command });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'updateState') {
        render(msg.state);
      }
    });

    vscode.postMessage({ command: 'requestState' });

    function render(s) {
      const pill = document.getElementById('statusPill');
      const pText = document.getElementById('statusText');
      const dot = document.getElementById('pulseDot');
      
      pill.className = 'status-pill status-' + s.statusState;
      pText.innerText = s.statusState.toUpperCase();
      dot.className = 'pulse-dot' + (s.statusState === 'tracking' || s.statusState === 'syncing' ? ' anim' : '');

      document.getElementById('statTime').innerText = s.durationMinutes + 'm';
      document.getElementById('statKeys').innerText = s.keystrokes;
      document.getElementById('statAdded').innerText = '+' + s.linesAdded;
      document.getElementById('statRemoved').innerText = '-' + s.linesRemoved;

      // Render Provenance
      if (s.provenance) {
        document.getElementById('provStyleText').innerText = s.provenance.style || 'Manual Typing';
        document.getElementById('provBarManual').style.width = s.provenance.manualPercent + '%';
        document.getElementById('provBarAi').style.width = s.provenance.aiPercent + '%';
        document.getElementById('provBarPaste').style.width = s.provenance.pastePercent + '%';
        document.getElementById('provManPct').innerText = s.provenance.manualPercent + '%';
        document.getElementById('provAiPct').innerText = s.provenance.aiPercent + '%';
        document.getElementById('provPastePct').innerText = s.provenance.pastePercent + '%';
      }

      // Render Tracked File Locations
      const filesListEl = document.getElementById('fileActivitiesList');
      const filesCountEl = document.getElementById('filesCountBadge');
      if (s.fileActivities && s.fileActivities.length > 0) {
        filesCountEl.innerText = s.fileActivities.length + ' files';
        filesListEl.innerHTML = s.fileActivities.slice(0, 6).map(fa => \`
          <div class="file-item">
            <div class="file-path" title="\${escapeHtml(fa.filePath)}">\${escapeHtml(fa.filePath)}</div>
            <span class="prov-badge prov-badge-\${fa.typingProvenance || 'manual'}">
              \${fa.typingProvenance === 'ai_assisted' ? '🤖 AI' : (fa.typingProvenance === 'copy_paste' ? '📋 Pasted' : (fa.typingProvenance === 'mixed' ? '⚡ Mixed' : '✍️ Manual'))}
            </span>
          </div>
        \`).join('');
      } else {
        filesCountEl.innerText = '0 files';
        filesListEl.innerHTML = '<div style="color:var(--vscode-descriptionForeground, #64748b); font-style:italic; padding:4px 0;">No active files tracked yet.</div>';
      }

      const offlineBadge = document.getElementById('offlineBadge');
      if (s.offlineCount > 0) {
        offlineBadge.style.display = 'inline-block';
        offlineBadge.innerText = s.offlineCount + ' offline';
      } else {
        offlineBadge.style.display = 'none';
      }

      const list = document.getElementById('commitsList');
      if (!s.commits || s.commits.length === 0) {
        list.innerHTML = '<div style="color:var(--vscode-descriptionForeground, #64748b); font-style:italic; padding:4px 0;">No commits recorded yet.</div>';
      } else {
        list.innerHTML = s.commits.slice(0, 5).map(c => \`
          <div class="commit-item">
            <div class="commit-msg">\${escapeHtml(c.message)}</div>
            <div class="commit-meta">
              <span>\${c.hash.slice(0,7)}</span>
              <span>+\${c.insertions} -\${c.deletions}</span>
            </div>
          </div>
        \`).join('');
      }
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FULL DASHBOARD WEBVIEW PANEL (LUXURY MODERN DESIGN)
// ─────────────────────────────────────────────────────────────────────────────
function openInteractiveDashboard(context: vscode.ExtensionContext, initialTab: string = 'overview') {
  if (activeDashboardPanel) {
    activeDashboardPanel.reveal(vscode.ViewColumn.One);
    activeDashboardPanel.webview.postMessage({ type: 'switchTab', tab: initialTab });
    activeDashboardPanel.webview.postMessage({ type: 'updateState', state: getTelemetrySnapshot() });
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'collabintel_dashboard',
    'CollabIntel – Student Dashboard',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  activeDashboardPanel = panel;

  panel.onDidDispose(() => {
    activeDashboardPanel = null;
  }, null, context.subscriptions);

  panel.webview.html = getDashboardHtml(initialTab);

  panel.webview.onDidReceiveMessage(async (msg) => {
    const cfg = vscode.workspace.getConfiguration('collabintel');
    switch (msg.command) {
      case 'requestState':
        panel.webview.postMessage({ type: 'updateState', state: getTelemetrySnapshot() });
        break;

      case 'saveConfig':
        await cfg.update('serverUrl', msg.serverUrl, vscode.ConfigurationTarget.Global);
        await cfg.update('authToken', msg.authToken, vscode.ConfigurationTarget.Global);
        await cfg.update('assignmentId', msg.assignmentId, vscode.ConfigurationTarget.Global);
        await cfg.update('syncIntervalMinutes', Number(msg.syncIntervalMinutes) || 5, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('✅ CollabIntel: Configuration updated and saved.');
        updateStatusBar('tracking');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        if (workspaceRoot) startSession(workspaceRoot);
        break;

      case 'syncNow':
        await saveAndSyncSession(context);
        vscode.window.showInformationMessage('✅ CollabIntel: Session synced to server.');
        break;

      case 'testConnection':
        const testConfig: ExtConfig = {
          serverUrl: msg.serverUrl || cfg.get<string>('serverUrl') || 'http://localhost:5000',
          authToken: msg.authToken || cfg.get<string>('authToken') || '',
          assignmentId: msg.assignmentId || cfg.get<string>('assignmentId') || '',
          syncIntervalMinutes: 5,
          trackOnlyLinkedRepo: true
        };
        const res = await testBackendConnection(testConfig);
        panel.webview.postMessage({ type: 'testResult', result: res });
        break;

      case 'clearOfflineCache':
        context.globalState.update('offline_sessions', []);
        vscode.window.showInformationMessage('CollabIntel: Offline sessions cleared.');
        panel.webview.postMessage({ type: 'updateState', state: getTelemetrySnapshot() });
        break;
    }
  }, undefined, context.subscriptions);

  setTimeout(() => {
    if (activeDashboardPanel) {
      activeDashboardPanel.webview.postMessage({ type: 'updateState', state: getTelemetrySnapshot() });
    }
  }, 250);
}

function getDashboardHtml(initialTab: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CollabIntel Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: var(--vscode-editor-background, #0b0f19);
      --fg: var(--vscode-editor-foreground, #f1f5f9);
      --card-bg: var(--vscode-sideBar-background, #111827);
      --border: var(--vscode-widget-border, rgba(255, 255, 255, 0.08));
      --accent: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      --input-bg: var(--vscode-input-background, #1e293b);
      --input-border: var(--vscode-input-border, rgba(255, 255, 255, 0.12));
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--fg);
      padding: 32px 24px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
    }

    /* HEADER */
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    .brand-title h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.6px;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-title p {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, #64748b);
      margin-top: 2px;
    }

    /* TABS */
    .nav-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 28px;
    }
    .tab-btn {
      padding: 12px 20px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--vscode-descriptionForeground, #94a3b8);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tab-btn svg { width: 16px; height: 16px; opacity: 0.7; }
    .tab-btn:hover {
      color: var(--fg);
    }
    .tab-btn.active {
      color: #818cf8;
      border-bottom-color: #6366f1;
      font-weight: 700;
    }
    .tab-btn.active svg { opacity: 1; stroke: #818cf8; }

    .tab-content {
      display: none;
      animation: fadeIn 0.3s ease;
    }
    .tab-content.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* METRIC CARDS */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .card:hover {
      border-color: rgba(99, 102, 241, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px -10px rgba(0,0,0,0.5);
    }
    .card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--vscode-descriptionForeground, #94a3b8);
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      font-feature-settings: "cv02", "cv03", "cv04", "cv11";
      font-variant-numeric: tabular-nums;
    }
    .val-green { color: #10b981; }
    .val-red { color: #f43f5e; }

    /* STATUS BANNER */
    .status-banner {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-left: 4px solid #6366f1;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    /* FORM ELEMENTS */
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
      color: var(--vscode-descriptionForeground, #cbd5e1);
    }
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #64748b);
      margin-bottom: 8px;
    }
    input[type="text"], input[type="password"], input[type="number"] {
      width: 100%;
      padding: 12px 14px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 8px;
      color: var(--fg);
      font-family: monospace;
      font-size: 13.5px;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }

    .btn {
      padding: 11px 22px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.3px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.35);
      transition: all 0.2s ease;
    }
    .btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(79, 70, 229, 0.45);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--fg);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: none;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.18);
    }

    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 14px;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--vscode-descriptionForeground, #64748b);
    }

    .test-box {
      margin-top: 16px;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
      font-weight: 600;
    }
    .test-box.success { display: block; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; }
    .test-box.error { display: block; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="dashboard-header">
      <div class="brand-title">
        <h1>CollabIntel Dashboard</h1>
        <p>Student Repository Telemetry &amp; Contribution Analytics</p>
      </div>
      <div>
        <button class="btn" onclick="postCmd('syncNow')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Sync Telemetry
        </button>
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <div class="nav-tabs">
      <button class="tab-btn active" id="tab-overview" onclick="switchTab('overview')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
        Overview &amp; Analytics
      </button>
      <button class="tab-btn" id="tab-commits" onclick="switchTab('commits')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Commits Log
      </button>
      <button class="tab-btn" id="tab-setup" onclick="switchTab('setup')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Setup &amp; Credentials
      </button>
      <button class="tab-btn" id="tab-settings" onclick="switchTab('settings')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Settings
      </button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="content-overview" class="tab-content active">
      <div class="status-banner">
        <div>
          <strong id="statusTitle" style="font-size:15px;">Checking Status...</strong>
          <div id="statusDesc" style="font-size:12px; color:var(--vscode-descriptionForeground, #94a3b8); margin-top:2px;">Loading state telemetry snapshot</div>
        </div>
        <button class="btn btn-secondary" onclick="postCmd('testConnection')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v8M18 10l-6 6-6-6M12 16v6"/></svg>
          Test Connection
        </button>
      </div>

      <div class="metrics-row">
        <div class="card">
          <div class="card-title">Session Time</div>
          <div class="card-value" id="valDuration">0m</div>
        </div>
        <div class="card">
          <div class="card-title">Keystrokes</div>
          <div class="card-value" id="valKeystrokes">0</div>
        </div>
        <div class="card">
          <div class="card-title">Lines Added</div>
          <div class="card-value val-green" id="valLinesAdded">+0</div>
        </div>
        <div class="card">
          <div class="card-title">Lines Removed</div>
          <div class="card-value val-red" id="valLinesRemoved">-0</div>
        </div>
        <div class="card">
          <div class="card-title">Files Modified</div>
          <div class="card-value" id="valFiles">0</div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-title">Modified Files List</div>
        <div id="filesList" style="font-size:13px; font-family:monospace; margin-top:10px;">
          (No files modified yet)
        </div>
      </div>
    </div>

    <!-- TAB 2: COMMITS LOG -->
    <div id="content-commits" class="tab-content">
      <div class="card">
        <div class="card-title">Captured Local Commits (This Session)</div>
        <table>
          <thead>
            <tr>
              <th>Commit Hash</th>
              <th>Message</th>
              <th>Date</th>
              <th>Files</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody id="commitsTableBody">
            <tr><td colspan="5" style="color:var(--vscode-descriptionForeground, #64748b)">No commits logged yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: SETUP & CREDENTIALS -->
    <div id="content-setup" class="tab-content">
      <div class="card">
        <div class="card-title">Link Student Account &amp; Assignment</div>
        <p class="hint" style="margin-bottom:20px;">Copy your Auth Token and Assignment ID from the CollabIntel Student Web Dashboard.</p>

        <div class="form-group">
          <label>Backend Server URL</label>
          <input type="text" id="cfgServerUrl" placeholder="http://localhost:5000" />
        </div>

        <div class="form-group">
          <label>Auth Token (JWT)</label>
          <input type="password" id="cfgAuthToken" placeholder="Paste student JWT token here..." />
        </div>

        <div class="form-group">
          <label>Assignment ID</label>
          <input type="text" id="cfgAssignmentId" placeholder="e.g. 64f3c8a2..." />
        </div>

        <div class="form-group">
          <label>Sync Interval (Minutes)</label>
          <input type="number" id="cfgSyncInterval" value="5" min="1" max="60" />
        </div>

        <div style="display:flex; gap:12px; margin-top:24px;">
          <button class="btn" onclick="saveCredentials()">💾 Save Configuration</button>
          <button class="btn btn-secondary" onclick="testFormConnection()">🔌 Test Connection</button>
        </div>

        <div id="testResultBox" class="test-box"></div>
      </div>
    </div>

    <!-- TAB 4: SETTINGS & CACHE -->
    <div id="content-settings" class="tab-content">
      <div class="card">
        <div class="card-title">Offline Cache &amp; Diagnostics</div>
        <p class="hint">Telemetry captured while offline is buffered locally and automatically synced when reconnected.</p>
        
        <div style="margin: 20px 0;">
          <strong>Queued Offline Sessions:</strong> <span id="offlineCountText" style="font-size:16px; font-weight:800;">0</span>
        </div>

        <button class="btn btn-secondary" onclick="postCmd('clearOfflineCache')">🗑️ Clear Offline Buffer</button>
      </div>
    </div>

  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentState = null;

    function postCmd(command) {
      vscode.postMessage({ command });
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const targetBtn = document.getElementById('tab-' + tabId);
      const targetContent = document.getElementById('content-' + tabId);
      if (targetBtn && targetContent) {
        targetBtn.classList.add('active');
        targetContent.classList.add('active');
      }
    }

    function saveCredentials() {
      const serverUrl = document.getElementById('cfgServerUrl').value.trim();
      const authToken = document.getElementById('cfgAuthToken').value.trim();
      const assignmentId = document.getElementById('cfgAssignmentId').value.trim();
      const syncIntervalMinutes = document.getElementById('cfgSyncInterval').value.trim();

      vscode.postMessage({
        command: 'saveConfig',
        serverUrl,
        authToken,
        assignmentId,
        syncIntervalMinutes
      });
    }

    function testFormConnection() {
      const serverUrl = document.getElementById('cfgServerUrl').value.trim();
      const authToken = document.getElementById('cfgAuthToken').value.trim();
      const assignmentId = document.getElementById('cfgAssignmentId').value.trim();

      const box = document.getElementById('testResultBox');
      box.className = 'test-box';
      box.style.display = 'block';
      box.innerText = 'Testing connection...';

      vscode.postMessage({
        command: 'testConnection',
        serverUrl,
        authToken,
        assignmentId
      });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'switchTab') {
        switchTab(msg.tab);
      } else if (msg.type === 'updateState') {
        currentState = msg.state;
        render(msg.state);
      } else if (msg.type === 'testResult') {
        const box = document.getElementById('testResultBox');
        if (msg.result.success) {
          box.className = 'test-box success';
          box.innerText = '✅ ' + msg.result.message;
        } else {
          box.className = 'test-box error';
          box.innerText = '❌ ' + msg.result.message;
        }
      }
    });

    vscode.postMessage({ command: 'requestState' });

    function render(s) {
      const title = document.getElementById('statusTitle');
      const desc = document.getElementById('statusDesc');
      if (s.isConfigured) {
        title.innerText = '● Tracking Active (' + s.statusState.toUpperCase() + ')';
        desc.innerText = 'Linked Assignment: ' + s.config.assignmentId + ' | Server: ' + s.config.serverUrl;
      } else {
        title.innerText = '⚠️ Configuration Required';
        desc.innerText = 'Please switch to the Setup & Credentials tab to link your student token.';
      }

      document.getElementById('valDuration').innerText = s.durationMinutes + 'm';
      document.getElementById('valKeystrokes').innerText = s.keystrokes;
      document.getElementById('valLinesAdded').innerText = '+' + s.linesAdded;
      document.getElementById('valLinesRemoved').innerText = '-' + s.linesRemoved;
      document.getElementById('valFiles').innerText = s.editedFilesCount;

      const filesDiv = document.getElementById('filesList');
      if (s.editedFilesList && s.editedFilesList.length > 0) {
        filesDiv.innerHTML = s.editedFilesList.map(f => '<div>• ' + escapeHtml(f) + '</div>').join('');
      } else {
        filesDiv.innerHTML = '<span style="color:var(--vscode-descriptionForeground, #64748b)">(No files modified yet)</span>';
      }

      const tbody = document.getElementById('commitsTableBody');
      if (!s.commits || s.commits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--vscode-descriptionForeground, #64748b)">No local commits recorded in this tracking session yet.</td></tr>';
      } else {
        tbody.innerHTML = s.commits.map(c => \`
          <tr>
            <td><code>\${c.hash.slice(0,8)}</code></td>
            <td>\${escapeHtml(c.message)}</td>
            <td>\${new Date(c.date).toLocaleTimeString()}</td>
            <td>\${c.filesChanged}</td>
            <td><span class="val-green">+\${c.insertions}</span> <span class="val-red">-\${c.deletions}</span></td>
          </tr>
        \`).join('');
      }

      if (document.activeElement.tagName !== 'INPUT') {
        document.getElementById('cfgServerUrl').value = s.config.serverUrl || '';
        document.getElementById('cfgAuthToken').value = s.config.authToken || '';
        document.getElementById('cfgAssignmentId').value = s.config.assignmentId || '';
        document.getElementById('cfgSyncInterval').value = s.config.syncIntervalMinutes || 5;
      }

      document.getElementById('offlineCountText').innerText = s.offlineCount;
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVATE & DEACTIVATE
// ─────────────────────────────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  console.log('[CollabIntel] Extension activating with modern UI...');

  const sidebarProvider = new CollabIntelSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('collabintel.sidebarView', sidebarProvider)
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'collabintel.openDashboard';
  context.subscriptions.push(statusBarItem);

  const cfg = getConfig();
  if (!cfg.authToken || !cfg.assignmentId) {
    updateStatusBar('unconfigured');
    vscode.window.showInformationMessage(
      'CollabIntel: Setup required to begin tracking your repository.',
      'Open Setup'
    ).then(choice => {
      if (choice === 'Open Setup') openInteractiveDashboard(context, 'setup');
    });
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  if (workspaceRoot) {
    startSession(workspaceRoot);
  }

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async event => {
    if (event.document.uri.scheme !== 'file') return;
    if (!isInsideWorkspace(event.document.uri)) return;

    const now = Date.now();
    const timeDelta = lastActivityTime > 0 ? (now - lastActivityTime) : 150;
    lastActivityTime = now;
    if (!sessionStart && workspaceRoot) startSession(workspaceRoot);

    const relativePath = vscode.workspace.asRelativePath(event.document.uri, false).replace(/\\/g, '/');
    editedFiles.add(relativePath);

    let fileItem = fileActivityMap.get(relativePath);
    if (!fileItem) {
      fileItem = {
        filePath: relativePath,
        action: createdFiles.has(relativePath) ? 'created' : 'edited',
        manualChars: 0,
        pasteChars: 0,
        aiChars: 0,
        manualKeystrokes: 0,
        pasteEvents: 0,
        aiEvents: 0,
        typingProvenance: 'manual',
        linesAdded: 0,
        linesRemoved: 0,
        timestamp: new Date().toISOString()
      };
      fileActivityMap.set(relativePath, fileItem);
    }

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
      if (textLen === 0) continue; // deletion only

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
      // CRITICAL: Windows clipboard uses \r\n but VS Code content changes use \n.
      // Normalize line endings before comparing.
      const normEndings = (s: string) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const clipNorm = normEndings(clipboardText);
      const textNorm = normEndings(text);
      const clipTrimmed = clipNorm.trim();
      const textTrimmed = textNorm.trim();
      const isClipboardMatch = clipNorm.length > 0 && textTrimmed.length > 0 && (
        textNorm === clipNorm ||
        textTrimmed === clipTrimmed ||
        clipNorm.startsWith(textNorm) ||
        clipTrimmed.startsWith(textTrimmed) ||
        (textTrimmed.length >= 6 && clipTrimmed.includes(textTrimmed)) ||
        (clipTrimmed.length >= 6 && textTrimmed.includes(clipTrimmed))
      );

      // AI AGENT vs USER PASTE vs MANUAL TYPING SIGNALS:
      const lines = text.split(/\r?\n/);
      const nonEmptyLines = lines.filter(l => l.trim().length > 0);
      const isMultiLine = nonEmptyLines.length > 1;
      const isLargeBlock = textLen >= 25 && isMultiLine;
      const isInstantBurstWithoutClipboard = timeDelta < 85 && textLen > 5 && !isClipboardMatch;

      let lineProvenance: 'manual' | 'ai_assisted' | 'copy_paste' = 'manual';

      // 1. User Clipboard Paste (clipboard matched OR large multi-line block inserted)
      if (isClipboardMatch || isLargeBlock) {
        pasteCount++;
        charactersPasted += textLen;
        fileItem.pasteEvents++;
        fileItem.pasteChars += textLen;
        lineProvenance = 'copy_paste';
      }
      // 2. AI Agent / Automated Code Synthesis (very fast burst without human paste)
      else if (isInstantBurstWithoutClipboard) {
        aiEventsCount++;
        aiCharsCount += textLen;
        fileItem.aiEvents++;
        fileItem.aiChars += textLen;
        lineProvenance = 'ai_assisted';
      }
      // 3. Genuine Manual Keystroke (Human typing cadence: character-by-character)
      else {
        keystrokeCount++;
        fileItem.manualKeystrokes++;
        fileItem.manualChars += textLen;
        lineProvenance = 'manual';
      }

      // Record exact line-by-line provenance and online/offline state
      if (!fileItem.lineRecords) fileItem.lineRecords = [];
      const startLineNum = change.range.start.line + 1;
      const insertedLines = text.split('\n');
      const timeIso = new Date().toISOString();
      // isOffline = true when the extension's last sync attempt failed (network error → offline buffer mode)
      const isCurrentlyOffline = currentStatusState === 'error';

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

      // Re-evaluate file-level typingProvenance based on character proportions.
      // Thresholds chosen so mixed typing (typing + occasional paste) stays 'manual'.
      const fTotal = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
      if (fTotal > 0) {
        const aiRatioFile   = fileItem.aiChars / fTotal;
        const pasteRatioFile = fileItem.pasteChars / fTotal;
        const manualRatioFile = fileItem.manualChars / fTotal;
        if (aiRatioFile > 0.40) fileItem.typingProvenance = 'ai_assisted';       // >40% AI chars
        else if (pasteRatioFile > 0.30) fileItem.typingProvenance = 'copy_paste'; // >30% paste
        else if (manualRatioFile >= 0.55) fileItem.typingProvenance = 'manual';   // majority typed
        else fileItem.typingProvenance = 'mixed';                                  // balanced
      }
    }

    broadcastStateToWebviews();
    triggerDebouncedAutoSync(context, 1500);
  }));

  context.subscriptions.push(vscode.workspace.onDidCreateFiles(event => {
    event.files.forEach(f => {
      if (!isInsideWorkspace(f)) return;
      lastActivityTime = Date.now();
      if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
      const rel = vscode.workspace.asRelativePath(f, false).replace(/\\/g, '/');
      try {
        if (fs.existsSync(f.fsPath) && fs.statSync(f.fsPath).isDirectory()) {
          createdFolders.add(rel);
        } else {
          createdFiles.add(rel);
          let fileItem = fileActivityMap.get(rel);
          if (!fileItem) {
            fileItem = {
              filePath: rel,
              action: 'created',
              manualChars: 0,
              pasteChars: 0,
              aiChars: 0,
              manualKeystrokes: 0,
              pasteEvents: 0,
              aiEvents: 0,
              typingProvenance: 'manual',
              linesAdded: 0,
              linesRemoved: 0,
              timestamp: new Date().toISOString()
            };
            fileActivityMap.set(rel, fileItem);
          } else {
            fileItem.action = 'created';
          }
        }
      } catch {
        createdFiles.add(rel);
      }
    });
    broadcastStateToWebviews();
    triggerDebouncedAutoSync(context, 1000);
  }));

  context.subscriptions.push(vscode.workspace.onDidDeleteFiles(event => {
    event.files.forEach(f => {
      if (!isInsideWorkspace(f)) return;
      lastActivityTime = Date.now();
      if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
      const rel = vscode.workspace.asRelativePath(f, false).replace(/\\/g, '/');
      deletedFiles.add(rel);
      deletedFolders.add(rel);
      let fileItem = fileActivityMap.get(rel);
      if (!fileItem) {
        fileItem = {
          filePath: rel,
          action: 'deleted',
          manualChars: 0,
          pasteChars: 0,
          aiChars: 0,
          manualKeystrokes: 0,
          pasteEvents: 0,
          aiEvents: 0,
          typingProvenance: 'manual',
          linesAdded: 0,
          linesRemoved: 0,
          timestamp: new Date().toISOString()
        };
        fileActivityMap.set(rel, fileItem);
      } else {
        fileItem.action = 'deleted';
      }
    });
    broadcastStateToWebviews();
    triggerDebouncedAutoSync(context, 1000);
  }));

  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.uri.scheme !== 'file') return;
    if (!isInsideWorkspace(doc.uri)) return;
    lastActivityTime = Date.now();
    if (!sessionStart && workspaceRoot) startSession(workspaceRoot);

    const rel = vscode.workspace.asRelativePath(doc.uri, false).replace(/\\/g, '/');
    let fileItem = fileActivityMap.get(rel);
    const docLen = doc.getText().length;
    const lineCount = doc.lineCount;

    // Detect file content that appeared without any keyboard/clipboard telemetry.
    // This happens when an external AI agent (e.g., Antigravity, Cline, Cursor agent mode)
    // writes directly to the filesystem — we never saw a onDidChangeTextDocument event for it.
    if (!fileItem) {
      // Brand-new file saved with NO prior edit telemetry → AI Agent created it
      fileItem = {
        filePath: rel,
        action: 'edited',
        manualChars: 0,
        pasteChars: 0,
        aiChars: docLen,
        manualKeystrokes: 0,
        pasteEvents: 0,
        aiEvents: 1,
        typingProvenance: 'ai_assisted',
        linesAdded: lineCount,
        linesRemoved: 0,
        lineRecords: [],
        timestamp: new Date().toISOString()
      };
      aiEventsCount++;
      aiCharsCount += docLen;
      linesAddedCount += lineCount;
      fileActivityMap.set(rel, fileItem);
      editedFiles.add(rel);
    } else {
      // File existed in telemetry — only attribute the DELTA as AI if the difference is large
      // (> 50 chars unaccounted) AND we have no existing edit telemetry for recent changes.
      // A small delta (< 50 chars) is just the extension catching up; don't override provenance.
      const loggedChars = fileItem.manualChars + fileItem.pasteChars + fileItem.aiChars;
      const delta = docLen - loggedChars;
      if (delta > 50 && fileItem.aiEvents === 0 && fileItem.pasteEvents === 0 && fileItem.manualChars < 10) {
        // This file appears to have had all its content injected without keyboard input
        fileItem.aiChars += delta;
        fileItem.aiEvents += 1;
        fileItem.typingProvenance = 'ai_assisted';
        aiEventsCount++;
        aiCharsCount += delta;
      }
      // If the file already has keyboard telemetry, the delta is just normal editor overhead — ignore it
    }

    broadcastStateToWebviews();
    triggerDebouncedAutoSync(context, 500);
  }));

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
    if (!editor || editor.document.uri.scheme !== 'file') return;
    lastActivityTime = Date.now();
    if (!sessionStart && workspaceRoot) startSession(workspaceRoot);
    broadcastStateToWebviews();
  }));

  if (workspaceRoot) {
    if (fs.existsSync(path.join(workspaceRoot, '.git'))) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(path.join(workspaceRoot, '.git'), 'COMMIT_EDITMSG'),
        false, false, true
      );

      watcher.onDidChange(async () => {
        lastActivityTime = Date.now();
        if (!sessionStart) startSession(workspaceRoot);
        vscode.window.setStatusBarMessage('$(sync~spin) CollabIntel: Git commit detected, syncing...', 4000);
        await saveAndSyncSession(context);
      });

      context.subscriptions.push(watcher);
    }
  }

  idleTimer = setInterval(() => {
    const idle = Date.now() - lastActivityTime;
    if (idle >= IDLE_TIMEOUT_MS && sessionStart) {
      saveAndSyncSession(context).then(() => {
        updateStatusBar('idle');
        sessionStart = null;
      });
    }
  }, 60 * 1000);

  const { syncIntervalMinutes } = getConfig();
  const syncMs = Math.max(1, syncIntervalMinutes) * 60 * 1000;
  syncTimer = setInterval(() => {
    if (sessionStart) {
      saveAndSyncSession(context);
    } else {
      flushOfflineCache(context);
    }
  }, syncMs);

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.setup', () => openInteractiveDashboard(context, 'setup'))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.openDashboard', () => openInteractiveDashboard(context, 'overview'))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.sync', async () => {
      await saveAndSyncSession(context);
      vscode.window.showInformationMessage('✅ CollabIntel: Telemetry synced successfully!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.testConnection', async () => {
      const res = await testBackendConnection(getConfig());
      if (res.success) vscode.window.showInformationMessage(`✅ ${res.message}`);
      else vscode.window.showErrorMessage(`❌ ${res.message}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('collabintel.status', () => openInteractiveDashboard(context, 'overview'))
  );

  flushOfflineCache(context);
  console.log('[CollabIntel] Modern UI extension activated successfully.');
}

export function deactivate() {
  if (idleTimer) clearInterval(idleTimer);
  if (syncTimer) clearInterval(syncTimer);
}
