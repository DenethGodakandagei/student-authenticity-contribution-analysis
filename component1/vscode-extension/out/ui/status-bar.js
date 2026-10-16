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
exports.updateStatusBar = exports.refreshStatusBarPendingCount = exports.updateTelemetryStatusBar = exports.getStatusState = exports.createStatusBar = exports.formatStatusBarText = exports.getSafePendingCount = void 0;
const vscode = __importStar(require("vscode"));
const event_store_1 = require("../storage/event-store");
// ─────────────────────────────────────────────────────────────────────────────
//  STATUS BAR MANAGEMENT (Plan 4 & Plan 6)
//  Spec text:
//    - $(check) Telemetry: Synced
//    - $(cloud-offline) Telemetry: 38 Offline Pending
//    - $(sync~spin) Telemetry: Syncing...
// ─────────────────────────────────────────────────────────────────────────────
let statusBarItem;
let currentStatusState = 'unconfigured';
/**
 * Safely query pending count directly from SQLite without throwing.
 */
function getSafePendingCount() {
    try {
        return (0, event_store_1.getPendingCount)();
    }
    catch {
        return 0;
    }
}
exports.getSafePendingCount = getSafePendingCount;
/**
 * Format status bar text according to spec.
 */
function formatStatusBarText(status, pendingCount) {
    switch (status) {
        case 'synced':
            return '$(check) Telemetry: Synced';
        case 'syncing':
            return '$(sync~spin) Telemetry: Syncing...';
        case 'offline_pending':
            return `$(cloud-offline) Telemetry: ${pendingCount} Offline Pending`;
    }
}
exports.formatStatusBarText = formatStatusBarText;
/**
 * Create and register the status bar item.
 */
function createStatusBar(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'collabintel.openDashboard';
    context.subscriptions.push(statusBarItem);
    return statusBarItem;
}
exports.createStatusBar = createStatusBar;
/**
 * Get the current status state.
 */
function getStatusState() {
    return currentStatusState;
}
exports.getStatusState = getStatusState;
/**
 * Update the telemetry sync status bar display with live SQLite pending counts.
 * Formats:
 *  - $(check) Telemetry: Synced
 *  - $(cloud-offline) Telemetry: <count> Offline Pending
 *  - $(sync~spin) Telemetry: Syncing...
 */
function updateTelemetryStatusBar(status, pendingCount, onUpdate) {
    if (!statusBarItem)
        return;
    const count = pendingCount !== undefined ? pendingCount : getSafePendingCount();
    switch (status) {
        case 'synced':
            currentStatusState = 'tracking';
            statusBarItem.text = formatStatusBarText('synced', count);
            statusBarItem.tooltip = 'All telemetry events are synced to the backend. Click to open dashboard.';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'syncing':
            currentStatusState = 'syncing';
            statusBarItem.text = formatStatusBarText('syncing', count);
            statusBarItem.tooltip = 'Syncing telemetry events to CollabIntel server...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'offline_pending':
            currentStatusState = 'error';
            statusBarItem.text = formatStatusBarText('offline_pending', count);
            statusBarItem.tooltip = `${count} telemetry event(s) buffered in SQLite. Auto-syncs when online. Click to open dashboard.`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
    }
    statusBarItem.show();
    if (onUpdate)
        onUpdate();
}
exports.updateTelemetryStatusBar = updateTelemetryStatusBar;
/**
 * Refresh status bar pending count directly from SQLite database.
 */
function refreshStatusBarPendingCount(onUpdate) {
    const pending = getSafePendingCount();
    if (currentStatusState === 'syncing') {
        updateTelemetryStatusBar('syncing', pending, onUpdate);
    }
    else if (pending > 0) {
        updateTelemetryStatusBar('offline_pending', pending, onUpdate);
    }
    else {
        updateTelemetryStatusBar('synced', 0, onUpdate);
    }
}
exports.refreshStatusBarPendingCount = refreshStatusBarPendingCount;
/**
 * Update the status bar display with support for standard StatusState.
 * @param state The new status state
 * @param onUpdate Optional callback invoked after state changes (e.g., to broadcast to webviews)
 */
function updateStatusBar(state, onUpdate) {
    currentStatusState = state;
    if (!statusBarItem)
        return;
    const count = getSafePendingCount();
    switch (state) {
        case 'tracking':
        case 'idle':
            if (count > 0) {
                statusBarItem.text = formatStatusBarText('offline_pending', count);
                statusBarItem.tooltip = `${count} telemetry event(s) buffered in SQLite. Click to open dashboard.`;
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            }
            else {
                statusBarItem.text = formatStatusBarText('synced', 0);
                statusBarItem.tooltip = 'Telemetry is fully synced. Click to open dashboard.';
                statusBarItem.backgroundColor = undefined;
            }
            break;
        case 'syncing':
            statusBarItem.text = formatStatusBarText('syncing', count);
            statusBarItem.tooltip = 'Syncing telemetry to CollabIntel server...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'error':
            statusBarItem.text = formatStatusBarText('offline_pending', count);
            statusBarItem.tooltip = `${count} telemetry events buffered in SQLite. Backend unreachable.`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'unconfigured':
            statusBarItem.text = '$(warning) CollabIntel: Setup Needed';
            statusBarItem.tooltip = 'Click to configure CollabIntel credentials and assignment.';
            statusBarItem.backgroundColor = undefined;
            break;
    }
    statusBarItem.show();
    if (onUpdate)
        onUpdate();
}
exports.updateStatusBar = updateStatusBar;
//# sourceMappingURL=status-bar.js.map