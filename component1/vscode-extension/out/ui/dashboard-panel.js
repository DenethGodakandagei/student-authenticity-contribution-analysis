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
exports.openInteractiveDashboard = exports.getActiveDashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PANEL STATE
// ─────────────────────────────────────────────────────────────────────────────
let activeDashboardPanel = null;
function getActiveDashboardPanel() {
    return activeDashboardPanel;
}
exports.getActiveDashboardPanel = getActiveDashboardPanel;
// ─────────────────────────────────────────────────────────────────────────────
//  OPEN INTERACTIVE DASHBOARD (Plan 6: External HTML & ML Features Tab)
// ─────────────────────────────────────────────────────────────────────────────
function openInteractiveDashboard(context, callbacks, initialTab = 'overview') {
    if (activeDashboardPanel) {
        activeDashboardPanel.reveal(vscode.ViewColumn.One);
        activeDashboardPanel.webview.postMessage({ type: 'switchTab', tab: initialTab });
        activeDashboardPanel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
        return;
    }
    const panel = vscode.window.createWebviewPanel('collabintel_dashboard', 'INCODE – Student Dashboard', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
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
                if (workspaceRoot)
                    callbacks.startSession(workspaceRoot);
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
                }
                else {
                    vscode.commands.executeCommand('collabintel.viewQueueStatus');
                }
                break;
            case 'toggleProvenanceHighlighting':
                vscode.commands.executeCommand('extension.toggleProvenanceHighlighting');
                panel.webview.postMessage({ type: 'updateState', state: callbacks.getTelemetrySnapshot() });
                break;
            case 'testConnection':
                const testConfig = {
                    serverUrl: msg.serverUrl || cfg.get('serverUrl') || 'http://localhost:5000',
                    authToken: msg.authToken || cfg.get('authToken') || '',
                    assignmentId: msg.assignmentId || cfg.get('assignmentId') || '',
                    syncIntervalMinutes: 5,
                    trackOnlyLinkedRepo: true,
                    operatingMode: cfg.get('operatingMode') || 'real'
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
exports.openInteractiveDashboard = openInteractiveDashboard;
/**
 * Load external dashboard.html template with fallback paths.
 */
function loadDashboardHtml(extensionPath) {
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
            }
            catch (err) {
                console.error('[INCODE] Error reading dashboard HTML from', p, err);
            }
        }
    }
    return `<!DOCTYPE html><html><body><h3>INCODE Dashboard</h3><p>Could not locate dashboard.html template.</p></body></html>`;
}
//# sourceMappingURL=dashboard-panel.js.map