import * as vscode from 'vscode';
export interface AuditReportData {
    totalEvents: number;
    pendingCount: number;
    syncedCount: number;
    lastSyncTime: string;
    lastSyncTimestamp: number | null;
    hashChainValid: boolean;
    hashChainDetails: {
        valid: boolean;
        checkedRows: number;
        error?: string;
    };
    storageSizeFormatted: string;
    storageBytes: number;
    oldestPending: string;
    newestPending: string;
}
/**
 * Format bytes to readable string (e.g. 142.5 KB).
 */
export declare function formatBytes(bytes: number): string;
/**
 * Fetch complete audit data from SQLite database.
 */
export declare function getAuditReportData(globalStoragePath: string): AuditReportData;
/**
 * Print formatted audit summary to the dedicated output channel.
 */
export declare function logAuditReportToChannel(data: AuditReportData): void;
/**
 * Open or reveal the quick audit viewer webview panel.
 */
export declare function openAuditWebview(context: vscode.ExtensionContext, globalStoragePath: string, onSyncRequest?: () => Promise<void>): void;
/**
 * Register command 'collabintel.viewQueueStatus' (Telemetry: View Local Queue Status).
 */
export declare function registerAuditViewerCommand(context: vscode.ExtensionContext, globalStoragePath: string, onSyncRequest?: () => Promise<void>): vscode.Disposable;
