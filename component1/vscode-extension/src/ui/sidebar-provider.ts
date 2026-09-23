import * as vscode from 'vscode';

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR CALLBACKS INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
export interface SidebarCallbacks {
  getTelemetrySnapshot: () => any;
  saveAndSyncSession: () => Promise<void>;
  openInteractiveDashboard: (tab?: string) => void;
  testBackendConnection: () => Promise<{ success: boolean; message: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR WEBVIEW VIEW PROVIDER
// ─────────────────────────────────────────────────────────────────────────────
export class CollabIntelSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _callbacks: SidebarCallbacks
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'requestState':
          this.postMessage({ type: 'updateState', state: this._callbacks.getTelemetrySnapshot() });
          break;
        case 'syncNow':
          await this._callbacks.saveAndSyncSession();
          vscode.window.showInformationMessage('✅ CollabIntel: Telemetry sync initiated.');
          break;
        case 'openDashboard':
          this._callbacks.openInteractiveDashboard();
          break;
        case 'testConnection':
          const testRes = await this._callbacks.testBackendConnection();
          if (testRes.success) vscode.window.showInformationMessage(`✅ ${testRes.message}`);
          else vscode.window.showErrorMessage(`❌ ${testRes.message}`);
          break;
        case 'openSetup':
          this._callbacks.openInteractiveDashboard('setup');
          break;
      }
    });

    setTimeout(() => {
      this.postMessage({ type: 'updateState', state: this._callbacks.getTelemetrySnapshot() });
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
