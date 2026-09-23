import * as vscode from 'vscode';
import { ExtConfig, StatusState } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD CALLBACKS INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
export interface DashboardCallbacks {
  getTelemetrySnapshot: () => any;
  saveAndSyncSession: () => Promise<void>;
  testBackendConnection: (cfg: ExtConfig) => Promise<{ success: boolean; message: string }>;
  updateStatusBar: (state: StatusState) => void;
  startSession: (workspaceRoot: string) => void;
  getConfig: () => ExtConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PANEL STATE
// ─────────────────────────────────────────────────────────────────────────────
let activeDashboardPanel: vscode.WebviewPanel | null = null;

export function getActiveDashboardPanel(): vscode.WebviewPanel | null {
  return activeDashboardPanel;
}

// ─────────────────────────────────────────────────────────────────────────────
//  OPEN INTERACTIVE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export function openInteractiveDashboard(
  context: vscode.ExtensionContext,
  callbacks: DashboardCallbacks,
  initialTab: string = 'overview'
): void {
  if (activeDashboardPanel) {
    activeDashboardPanel.reveal(vscode.ViewColumn.One);
    activeDashboardPanel.webview.postMessage({ type: 'switchTab', tab: initialTab });
    activeDashboardPanel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
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
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        break;

      case 'saveConfig':
        await cfg.update('serverUrl', msg.serverUrl, vscode.ConfigurationTarget.Global);
        await cfg.update('authToken', msg.authToken, vscode.ConfigurationTarget.Global);
        await cfg.update('assignmentId', msg.assignmentId, vscode.ConfigurationTarget.Global);
        await cfg.update('syncIntervalMinutes', Number(msg.syncIntervalMinutes) || 5, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('✅ CollabIntel: Configuration updated and saved.');
        callbacks.updateStatusBar('tracking');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        if (workspaceRoot) callbacks.startSession(workspaceRoot);
        break;

      case 'syncNow':
        await callbacks.saveAndSyncSession();
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
        const res = await callbacks.testBackendConnection(testConfig);
        panel.webview.postMessage({ type: 'testResult', result: res });
        break;

      case 'clearOfflineCache':
        context.globalState.update('offline_sessions', []);
        vscode.window.showInformationMessage('CollabIntel: Offline sessions cleared.');
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        break;
    }
  }, undefined, context.subscriptions);

  setTimeout(() => {
    if (activeDashboardPanel) {
      activeDashboardPanel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
    }
  }, 250);
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD HTML TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
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
