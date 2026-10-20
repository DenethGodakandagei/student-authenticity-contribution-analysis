import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
  computeSlidingWindow?: () => any;
  viewQueueAudit?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PANEL STATE
// ─────────────────────────────────────────────────────────────────────────────
let activeDashboardPanel: vscode.WebviewPanel | null = null;

export function getActiveDashboardPanel(): vscode.WebviewPanel | null {
  return activeDashboardPanel;
}

// ─────────────────────────────────────────────────────────────────────────────
//  OPEN INTERACTIVE DASHBOARD (Plan 6: External HTML & ML Features Tab)
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
    'INCODE – Student Dashboard',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  activeDashboardPanel = panel;

  panel.onDidDispose(() => {
    activeDashboardPanel = null;
  }, null, context.subscriptions);

  panel.webview.html = loadDashboardHtml(context.extensionPath);

  panel.webview.onDidReceiveMessage(async (msg) => {
    const cfg = vscode.workspace.getConfiguration('collabintel');
    switch (msg.command) {
      case 'requestState':
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        if (initialTab && initialTab !== 'overview') {
          panel.webview.postMessage({ type: 'switchTab', tab: initialTab });
        }
        break;

      case 'saveConfig':
        await cfg.update('serverUrl', msg.serverUrl, vscode.ConfigurationTarget.Global);
        await cfg.update('authToken', msg.authToken, vscode.ConfigurationTarget.Global);
        await cfg.update('assignmentId', msg.assignmentId, vscode.ConfigurationTarget.Global);
        await cfg.update('syncIntervalMinutes', Number(msg.syncIntervalMinutes) || 5, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('INCODE: Settings saved.');
        callbacks.updateStatusBar('tracking');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        if (workspaceRoot) callbacks.startSession(workspaceRoot);
        break;

      case 'syncNow':
        await callbacks.saveAndSyncSession();
        vscode.window.showInformationMessage('INCODE: Session synced.');
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        break;

      case 'computeSlidingWindow':
        if (callbacks.computeSlidingWindow) {
          callbacks.computeSlidingWindow();
        }
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        vscode.window.showInformationMessage('INCODE: 5-minute ML sliding window recomputed.');
        break;

      case 'viewQueueAudit':
        if (callbacks.viewQueueAudit) {
          callbacks.viewQueueAudit();
        } else {
          vscode.commands.executeCommand('collabintel.viewQueueStatus');
        }
        break;

      case 'toggleProvenanceHighlighting':
        vscode.commands.executeCommand('extension.toggleProvenanceHighlighting');
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        break;

      case 'testConnection':
        const testConfig: ExtConfig = {
          serverUrl: msg.serverUrl || cfg.get<string>('serverUrl') || 'http://localhost:5000',
          authToken: msg.authToken || cfg.get<string>('authToken') || '',
          assignmentId: msg.assignmentId || cfg.get<string>('assignmentId') || '',
          syncIntervalMinutes: 5,
          trackOnlyLinkedRepo: true,
          operatingMode: (cfg.get<string>('operatingMode') as 'real' | 'experimental') || 'real'
        };
        const res = await callbacks.testBackendConnection(testConfig);
        panel.webview.postMessage({ type: 'testResult', result: res });
        break;

      case 'switchMode':
        vscode.commands.executeCommand('collabintel.switchMode');
        break;

      case 'clearOfflineCache':
        context.globalState.update('offline_sessions', []);
        vscode.window.showInformationMessage('INCODE: Offline sessions cleared.');
        panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        break;
    }
  }, undefined, context.subscriptions);

  setTimeout(() => {
    if (activeDashboardPanel) {
      activeDashboardPanel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
      if (initialTab && initialTab !== 'overview') {
        activeDashboardPanel.webview.postMessage({ type: 'switchTab', tab: initialTab });
      }
    }
  }, 250);
}

/**
 * Load external dashboard.html template with fallback paths.
 */
function loadDashboardHtml(extensionPath: string): string {
  const candidatePaths = [
    path.join(extensionPath, 'src', 'ui', 'html', 'dashboard.html'),
    path.join(extensionPath, 'out', 'ui', 'html', 'dashboard.html'),
    path.join(__dirname, 'html', 'dashboard.html'),
    path.join(__dirname, '..', 'src', 'ui', 'html', 'dashboard.html')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, 'utf8');
      } catch (err) {
        console.error('[INCODE] Error reading dashboard HTML from', p, err);
      }
    }
  }

  return `<!DOCTYPE html><html><body><h3>INCODE Dashboard</h3><p>Could not locate dashboard.html template.</p></body></html>`;
}
