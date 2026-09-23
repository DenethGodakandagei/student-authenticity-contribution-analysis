import * as vscode from 'vscode';
import { getQueueStatus } from '../storage/event-store';
import { getDatabase } from '../storage/database';
import { verifyChain } from '../storage/hash-chain';

// ─────────────────────────────────────────────────────────────────────────────
//  AUDIT VIEWER — Local SQLite Queue & Integrity Status (Plan 6)
// ─────────────────────────────────────────────────────────────────────────────

let auditOutputChannel: vscode.OutputChannel | null = null;
let auditWebviewPanel: vscode.WebviewPanel | null = null;

export interface AuditReportData {
  totalEvents: number;
  pendingCount: number;
  syncedCount: number;
  lastSyncTime: string;
  lastSyncTimestamp: number | null;
  hashChainValid: boolean;
  hashChainDetails: { valid: boolean; checkedRows: number; error?: string };
  storageSizeFormatted: string;
  storageBytes: number;
  oldestPending: string;
  newestPending: string;
}

/**
 * Format bytes to readable string (e.g. 142.5 KB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Fetch complete audit data from SQLite database.
 */
export function getAuditReportData(globalStoragePath: string): AuditReportData {
  const queueStatus = getQueueStatus(globalStoragePath);
  const chainResult = verifyChain(100);

  let lastSyncTimestamp: number | null = null;
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT MAX(timestamp) as last_sync FROM telemetry_events WHERE sync_status = 1'
    ).get() as { last_sync: number | null };
    lastSyncTimestamp = row?.last_sync || null;
  } catch {
    lastSyncTimestamp = null;
  }

  const formatDate = (ts: number | null) => (ts ? new Date(ts).toLocaleString() : 'None');

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

/**
 * Print formatted audit summary to the dedicated output channel.
 */
export function logAuditReportToChannel(data: AuditReportData): void {
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

/**
 * Generate HTML view for the quick audit modal webview.
 */
function getAuditWebviewHtml(data: AuditReportData): string {
  const chainBadge = data.hashChainValid
    ? '<span class="badge badge-success">✅ Valid & Verified</span>'
    : '<span class="badge badge-error">❌ Invalid / Corrupted</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CollabIntel Telemetry Queue Audit</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      color: var(--vscode-foreground, #e2e8f0);
      background-color: var(--vscode-editor-background, #0f172a);
      line-height: 1.5;
    }
    h2 {
      margin-top: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.1));
      padding-bottom: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }
    .card {
      background: var(--vscode-sideBar-background, #1e293b);
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 16px;
    }
    .card-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }
    .card-value {
      font-size: 24px;
      font-weight: 700;
      margin-top: 6px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .badge-error { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      background: var(--vscode-sideBar-background, #1e293b);
      border-radius: 8px;
      overflow: hidden;
    }
    td, th {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.06));
    }
    th { opacity: 0.7; font-weight: 600; font-size: 12px; }
    .actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
    }
    button {
      background: var(--vscode-button-background, #6366f1);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground, #4f46e5);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground, #334155);
      color: var(--vscode-button-secondaryForeground, #e2e8f0);
    }
  </style>
</head>
<body>
  <h2><span>🛡️</span> CollabIntel — Local Telemetry Audit</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Pending Events</div>
      <div class="card-value" style="color: ${data.pendingCount > 0 ? '#f59e0b' : '#10b981'};">${data.pendingCount}</div>
    </div>
    <div class="card">
      <div class="card-title">Synced Events</div>
      <div class="card-value" style="color: #60a5fa;">${data.syncedCount}</div>
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
    <button onclick="sendMessage('sync')">⚡ Sync Now</button>
    <button class="secondary" onclick="sendMessage('refresh')">🔄 Refresh Audit</button>
    <button class="secondary" onclick="sendMessage('viewOutput')">📄 Open Output Channel</button>
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
export function openAuditWebview(
  context: vscode.ExtensionContext,
  globalStoragePath: string,
  onSyncRequest?: () => Promise<void>
): void {
  const data = getAuditReportData(globalStoragePath);
  logAuditReportToChannel(data);

  if (auditWebviewPanel) {
    auditWebviewPanel.reveal(vscode.ViewColumn.Beside);
    auditWebviewPanel.webview.html = getAuditWebviewHtml(data);
    return;
  }

  auditWebviewPanel = vscode.window.createWebviewPanel(
    'collabintel_audit_viewer',
    'Telemetry: Local Queue Status',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  auditWebviewPanel.webview.html = getAuditWebviewHtml(data);

  auditWebviewPanel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.command) {
      case 'sync':
        if (onSyncRequest) {
          await onSyncRequest();
          const refreshed = getAuditReportData(globalStoragePath);
          logAuditReportToChannel(refreshed);
          if (auditWebviewPanel) auditWebviewPanel.webview.html = getAuditWebviewHtml(refreshed);
        }
        break;
      case 'refresh':
        const refreshed = getAuditReportData(globalStoragePath);
        logAuditReportToChannel(refreshed);
        if (auditWebviewPanel) auditWebviewPanel.webview.html = getAuditWebviewHtml(refreshed);
        break;
      case 'viewOutput':
        if (auditOutputChannel) auditOutputChannel.show(true);
        break;
    }
  });

  auditWebviewPanel.onDidDispose(() => {
    auditWebviewPanel = null;
  });
}

/**
 * Register command 'collabintel.viewQueueStatus' (Telemetry: View Local Queue Status).
 */
export function registerAuditViewerCommand(
  context: vscode.ExtensionContext,
  globalStoragePath: string,
  onSyncRequest?: () => Promise<void>
): vscode.Disposable {
  return vscode.commands.registerCommand('collabintel.viewQueueStatus', () => {
    openAuditWebview(context, globalStoragePath, onSyncRequest);
  });
}
