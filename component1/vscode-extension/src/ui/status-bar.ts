import * as vscode from 'vscode';
import { StatusState } from '../types';
import { getPendingCount } from '../storage/event-store';
import { getConfig } from '../config/settings';

// ─────────────────────────────────────────────────────────────────────────────
//  STATUS BAR MANAGEMENT (Dual-Mode Real vs Experimental)
// ─────────────────────────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;
let currentStatusState: StatusState = 'unconfigured';

/**
 * Safely query pending count directly from SQLite without throwing.
 */
export function getSafePendingCount(): number {
  try {
    return getPendingCount();
  } catch {
    return 0;
  }
}

let extContext: vscode.ExtensionContext | null = null;

/**
 * Format status bar text reflecting active operating mode.
 */
export function formatStatusBarText(status: TelemetryStatus, pendingCount: number): string {
  const cfg = getConfig();
  const isExp = cfg.operatingMode === 'experimental';
  if (isExp) {
    const pId = extContext?.workspaceState?.get<string>('telemetry_participant_id') || 'P01';
    const task = extContext?.workspaceState?.get<string>('telemetry_task_condition') === 'TASK_B_AI' ? 'Task B (AI)' : 'Task A (Manual)';
    const pendingBadge = pendingCount > 0 ? ` (${pendingCount})` : '';
    return `$(beaker) INCODE [${pId}: ${task}]${pendingBadge}`;
  }

  const prefix = '$(shield) INCODE';
  switch (status) {
    case 'synced':
      return `${prefix}: Synced`;
    case 'syncing':
      return `$(sync~spin) INCODE: Syncing...`;
    case 'offline_pending':
      return `$(cloud-offline) ${prefix}: ${pendingCount} Pending`;
  }
}

/**
 * Create and register the status bar item.
 */
export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  extContext = context;
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'collabintel.statusBarMenu';
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

/**
 * Get the current status state.
 */
export function getStatusState(): StatusState {
  return currentStatusState;
}

export type TelemetryStatus = 'synced' | 'syncing' | 'offline_pending';

/**
 * Update the telemetry sync status bar display with live SQLite pending counts.
 * Formats:
 *  - $(check) Telemetry: Synced
 *  - $(cloud-offline) Telemetry: <count> Offline Pending
 *  - $(sync~spin) Telemetry: Syncing...
 */
export function updateTelemetryStatusBar(
  status: TelemetryStatus,
  pendingCount?: number,
  onUpdate?: () => void
): void {
  if (!statusBarItem) return;

  const count = pendingCount !== undefined ? pendingCount : getSafePendingCount();

  const cfg = getConfig();
  const isExp = cfg.operatingMode === 'experimental';
  const modeLabel = isExp ? '[Experimental Mode]' : '[Real Mode]';

  switch (status) {
    case 'synced':
      currentStatusState = 'tracking';
      statusBarItem.text = formatStatusBarText('synced', count);
      statusBarItem.tooltip = `INCODE ${modeLabel}: All telemetry events are synced. Click to open dashboard.`;
      statusBarItem.backgroundColor = undefined;
      break;

    case 'syncing':
      currentStatusState = 'syncing';
      statusBarItem.text = formatStatusBarText('syncing', count);
      statusBarItem.tooltip = `INCODE ${modeLabel}: Syncing telemetry events to server...`;
      statusBarItem.backgroundColor = undefined;
      break;

    case 'offline_pending':
      currentStatusState = 'error';
      statusBarItem.text = formatStatusBarText('offline_pending', count);
      statusBarItem.tooltip = `INCODE ${modeLabel}: ${count} event(s) buffered in SQLite. Auto-syncs when online.`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
  }

  statusBarItem.show();
  if (onUpdate) onUpdate();
}

/**
 * Refresh status bar pending count directly from SQLite database.
 */
export function refreshStatusBarPendingCount(onUpdate?: () => void): void {
  const pending = getSafePendingCount();
  if (currentStatusState === 'syncing') {
    updateTelemetryStatusBar('syncing', pending, onUpdate);
  } else if (pending > 0) {
    updateTelemetryStatusBar('offline_pending', pending, onUpdate);
  } else {
    updateTelemetryStatusBar('synced', 0, onUpdate);
  }
}

/**
 * Update the status bar display with support for standard StatusState.
 * @param state The new status state
 * @param onUpdate Optional callback invoked after state changes (e.g., to broadcast to webviews)
 */
export function updateStatusBar(state: StatusState, onUpdate?: () => void): void {
  currentStatusState = state;
  if (!statusBarItem) return;

  const count = getSafePendingCount();

  switch (state) {
    case 'tracking':
    case 'idle':
      if (count > 0) {
        statusBarItem.text = formatStatusBarText('offline_pending', count);
        statusBarItem.tooltip = `${count} telemetry event(s) buffered in SQLite. Click to open dashboard.`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      } else {
        statusBarItem.text = formatStatusBarText('synced', 0);
        statusBarItem.tooltip = 'Telemetry is fully synced. Click to open dashboard.';
        statusBarItem.backgroundColor = undefined;
      }
      break;

    case 'syncing':
      statusBarItem.text = formatStatusBarText('syncing', count);
      statusBarItem.tooltip = 'Syncing telemetry to INCODE server...';
      statusBarItem.backgroundColor = undefined;
      break;

    case 'error':
      statusBarItem.text = formatStatusBarText('offline_pending', count);
      statusBarItem.tooltip = `${count} telemetry events buffered in SQLite. Backend unreachable.`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;

    case 'unconfigured':
      statusBarItem.text = '$(warning) INCODE: Setup Needed';
      statusBarItem.tooltip = 'Click to configure INCODE credentials and assignment.';
      statusBarItem.backgroundColor = undefined;
      break;
  }

  statusBarItem.show();
  if (onUpdate) onUpdate();
}
