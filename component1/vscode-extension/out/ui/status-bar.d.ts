import * as vscode from 'vscode';
import { StatusState } from '../types';
/**
 * Safely query pending count directly from SQLite without throwing.
 */
export declare function getSafePendingCount(): number;
/**
 * Format status bar text according to spec.
 */
export declare function formatStatusBarText(status: TelemetryStatus, pendingCount: number): string;
/**
 * Create and register the status bar item.
 */
export declare function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem;
/**
 * Get the current status state.
 */
export declare function getStatusState(): StatusState;
export type TelemetryStatus = 'synced' | 'syncing' | 'offline_pending';
/**
 * Update the telemetry sync status bar display with live SQLite pending counts.
 * Formats:
 *  - $(check) Telemetry: Synced
 *  - $(cloud-offline) Telemetry: <count> Offline Pending
 *  - $(sync~spin) Telemetry: Syncing...
 */
export declare function updateTelemetryStatusBar(status: TelemetryStatus, pendingCount?: number, onUpdate?: () => void): void;
/**
 * Refresh status bar pending count directly from SQLite database.
 */
export declare function refreshStatusBarPendingCount(onUpdate?: () => void): void;
/**
 * Update the status bar display with support for standard StatusState.
 * @param state The new status state
 * @param onUpdate Optional callback invoked after state changes (e.g., to broadcast to webviews)
 */
export declare function updateStatusBar(state: StatusState, onUpdate?: () => void): void;
