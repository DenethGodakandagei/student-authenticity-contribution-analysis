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
exports.registerAuditViewerCommand = exports.openAuditWebview = exports.logAuditReportToChannel = exports.getAuditReportData = exports.formatBytes = void 0;
const vscode = __importStar(require("vscode"));
const event_store_1 = require("../storage/event-store");
const database_1 = require("../storage/database");
const hash_chain_1 = require("../storage/hash-chain");
// ─────────────────────────────────────────────────────────────────────────────
//  AUDIT VIEWER — Local SQLite Queue & Integrity Status (Plan 6)
// ─────────────────────────────────────────────────────────────────────────────
let auditOutputChannel = null;
let auditWebviewPanel = null;
/**
 * Format bytes to readable string (e.g. 142.5 KB).
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
exports.formatBytes = formatBytes;
/**
 * Fetch complete audit data from SQLite database.
 */
function getAuditReportData(globalStoragePath) {
    const queueStatus = (0, event_store_1.getQueueStatus)(globalStoragePath);
    const chainResult = (0, hash_chain_1.verifyChain)(100);
    let lastSyncTimestamp = null;
    try {
        const db = (0, database_1.getDatabase)();
        const row = db.prepare('SELECT MAX(timestamp) as last_sync FROM telemetry_events WHERE sync_status = 1').get();
        lastSyncTimestamp = row?.last_sync || null;
    }
    catch {
        lastSyncTimestamp = null;
    }
    const formatDate = (ts) => (ts ? new Date(ts).toLocaleString() : 'None');
    return {
        totalEvents: queueStatus.totalEvents,
        pendingCount: queueStatus.pendingCount,
        syncedCount: queueStatus.syncedCount,
        lastSyncTime: formatDate(lastSyncTimestamp),
        lastSyncTimestamp,
        hashChainValid: chainResult.valid,
        hashChainDetails: chainResult,
        storageSizeFormatted: formatBytes(queueStatus.storageBytes),
        storageBytes: queueStatus.storageBytes,
        oldestPending: formatDate(queueStatus.oldestPendingTimestamp),
        newestPending: formatDate(queueStatus.newestPendingTimestamp)
    };
}
exports.getAuditReportData = getAuditReportData;
/**
 * Print formatted audit summary to the dedicated output channel.
 */
function logAuditReportToChannel(data) {
    if (!auditOutputChannel) {
        auditOutputChannel = vscode.window.createOutputChannel('CollabIntel: Local Telemetry Audit');
    }
    const timestamp = new Date().toISOString();
    auditOutputChannel.clear();
    auditOutputChannel.appendLine(`================================================================`);
    auditOutputChannel.appendLine(`       COLLABINTEL — LOCAL TELEMETRY AUDIT & QUEUE STATUS       `);
    auditOutputChannel.appendLine(`       Generated: ${timestamp}                                 `);
    auditOutputChannel.appendLine(`================================================================`);
    auditOutputChannel.appendLine('');
    auditOutputChannel.appendLine(`  • Total Events in DB:      ${data.totalEvents}`);
    auditOutputChannel.appendLine(`  • Offline Pending Events:  ${data.pendingCount}`);
    auditOutputChannel.appendLine(`  • Synced Events:           ${data.syncedCount}`);
    auditOutputChannel.appendLine(`  • Last Sync Time:          ${data.lastSyncTime}`);
    auditOutputChannel.appendLine(`  • Cryptographic Chain:     ${data.hashChainValid ? '✅ VALID (Integrity Verified)' : '❌ INVALID / CORRUPTED'}`);
    if (data.hashChainDetails.error) {
        auditOutputChannel.appendLine(`    ↳ Chain Check Details:   ${data.hashChainDetails.error}`);
    }
    auditOutputChannel.appendLine(`  • Local Storage Size:      ${data.storageSizeFormatted} (${data.storageBytes} bytes)`);
    auditOutputChannel.appendLine(`  • Oldest Pending Event:    ${data.oldestPending}`);
    auditOutputChannel.appendLine(`  • Newest Pending Event:    ${data.newestPending}`);
    auditOutputChannel.appendLine('');
    auditOutputChannel.appendLine(`================================================================`);
    auditOutputChannel.show(true);
}
exports.logAuditReportToChannel = logAuditReportToChannel;
/**
 * Generate HTML view for the quick audit modal webview.
 */
function getAuditWebviewHtml(data) {
    const chainBadge = data.hashChainValid
        ? '<span class="badge badge-success"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Valid &amp; Verified</span>'
        : '<span class="badge badge-error"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Invalid / Corrupted</span>';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CollabIntel Telemetry Queue Audit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
      padding: 24px;
      color: var(--vscode-foreground, #f5f5f7);
      background-color: var(--vscode-editor-background, #1c1c1e);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    h2 {
      margin-top: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 14px;
      border-bottom: 0.5px solid rgba(255,255,255,0.1);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      margin: 18px 0;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 16px;
      transition: background 0.2s ease;
    }
    .card:hover { background: rgba(255, 255, 255, 0.06); }
    .card-title {
      font-size: 11px;
      font-weight: 500;
      color: rgba(235, 235, 245, 0.6);
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 24px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: rgba(48, 209, 88, 0.15); color: #30D158; }
    .badge-error { background: rgba(255, 69, 58, 0.15); color: #FF453A; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      overflow: hidden;
      border: 0.5px solid rgba(255,255,255,0.06);
    }
    td, th {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 0.5px solid rgba(255,255,255,0.06);
      font-size: 12px;
    }
    th {
      font-weight: 600;
      font-size: 11px;
      color: rgba(235, 235, 245, 0.6);
    }
    td:last-child { font-family: 'SF Mono', 'Menlo', monospace; font-size: 11px; }
    .actions {
      margin-top: 20px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    button {
      background: #007AFF;
      color: #fff;
      border: none;
      padding: 9px 16px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      font-family: 'Inter', -apple-system, sans-serif;
    }
    button:hover { filter: brightness(1.1); }
    button:active { filter: brightness(0.9); transform: scale(0.98); }
    button.secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #007AFF;
    }
    button.secondary:hover { background: rgba(255, 255, 255, 0.12); }
  </style>
</head>
<body>
  <h2>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30D158" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    CollabIntel — Local Telemetry Audit
  </h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Pending Events</div>
      <div class="card-value" style="color: ${data.pendingCount > 0 ? '#FF9F0A' : '#30D158'};">${data.pendingCount}</div>
    </div>
    <div class="card">
      <div class="card-title">Synced Events</div>
      <div class="card-value" style="color: #007AFF;">${data.syncedCount}</div>
    </div>
    <div class="card">
      <div class="card-title">Total In Local DB</div>
      <div class="card-value">${data.totalEvents}</div>
    </div>
    <div class="card">
      <div class="card-title">Storage Size</div>
      <div class="card-value">${data.storageSizeFormatted}</div>
    </div>
  </div>

  <table>
    <tr><th>Property</th><th>Value</th></tr>
    <tr><td>Cryptographic Hash Chain</td><td>${chainBadge}</td></tr>
    <tr><td>Last Successful Sync</td><td>${data.lastSyncTime}</td></tr>
    <tr><td>Oldest Pending Timestamp</td><td>${data.oldestPending}</td></tr>
    <tr><td>Newest Pending Timestamp</td><td>${data.newestPending}</td></tr>
    <tr><td>Local Storage File Size</td><td>${data.storageBytes} bytes</td></tr>
  </table>

  <div class="actions">
    <button onclick="sendMessage('sync')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Sync Now
    </button>
    <button class="secondary" onclick="sendMessage('refresh')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
      Refresh Audit
    </button>
    <button class="secondary" onclick="sendMessage('viewOutput')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      Open Output Channel
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function sendMessage(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
}
/**
 * Open or reveal the quick audit viewer webview panel.
 */
function openAuditWebview(context, globalStoragePath, onSyncRequest) {
    const data = getAuditReportData(globalStoragePath);
    logAuditReportToChannel(data);
    if (auditWebviewPanel) {
        auditWebviewPanel.reveal(vscode.ViewColumn.Beside);
        auditWebviewPanel.webview.html = getAuditWebviewHtml(data);
        return;
    }
    auditWebviewPanel = vscode.window.createWebviewPanel('collabintel_audit_viewer', 'Telemetry: Local Queue Status', vscode.ViewColumn.Beside, { enableScripts: true });
    auditWebviewPanel.webview.html = getAuditWebviewHtml(data);
    auditWebviewPanel.webview.onDidReceiveMessage(async (msg) => {
        switch (msg.command) {
            case 'sync':
                if (onSyncRequest) {
                    await onSyncRequest();
                    const refreshed = getAuditReportData(globalStoragePath);
                    logAuditReportToChannel(refreshed);
                    if (auditWebviewPanel)
                        auditWebviewPanel.webview.html = getAuditWebviewHtml(refreshed);
                }
                break;
            case 'refresh':
                const refreshed = getAuditReportData(globalStoragePath);
                logAuditReportToChannel(refreshed);
                if (auditWebviewPanel)
                    auditWebviewPanel.webview.html = getAuditWebviewHtml(refreshed);
                break;
            case 'viewOutput':
                if (auditOutputChannel)
                    auditOutputChannel.show(true);
                break;
        }
    });
    auditWebviewPanel.onDidDispose(() => {
        auditWebviewPanel = null;
    });
}
exports.openAuditWebview = openAuditWebview;
/**
 * Register command 'collabintel.viewQueueStatus' (Telemetry: View Local Queue Status).
 */
function registerAuditViewerCommand(context, globalStoragePath, onSyncRequest) {
    return vscode.commands.registerCommand('collabintel.viewQueueStatus', () => {
        openAuditWebview(context, globalStoragePath, onSyncRequest);
    });
}
exports.registerAuditViewerCommand = registerAuditViewerCommand;
//# sourceMappingURL=audit-viewer.js.map