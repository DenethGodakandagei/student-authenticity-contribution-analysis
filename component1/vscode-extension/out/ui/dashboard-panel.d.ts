import * as vscode from 'vscode';
import { ExtConfig, StatusState } from '../types';
export interface DashboardCallbacks {
    getTelemetrySnapshot: () => any;
    saveAndSyncSession: () => Promise<void>;
    testBackendConnection: (cfg: ExtConfig) => Promise<{
        success: boolean;
        message: string;
    }>;
    updateStatusBar: (state: StatusState) => void;
    startSession: (workspaceRoot: string) => void;
    getConfig: () => ExtConfig;
    computeSlidingWindow?: () => any;
    viewQueueAudit?: () => void;
}
export declare function getActiveDashboardPanel(): vscode.WebviewPanel | null;
export declare function openInteractiveDashboard(context: vscode.ExtensionContext, callbacks: DashboardCallbacks, initialTab?: string): void;
