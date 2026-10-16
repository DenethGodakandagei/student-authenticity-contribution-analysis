import * as vscode from 'vscode';
export interface SidebarCallbacks {
    getTelemetrySnapshot: () => any;
    saveAndSyncSession: () => Promise<void>;
    openInteractiveDashboard: (tab?: string) => void;
    testBackendConnection: () => Promise<{
        success: boolean;
        message: string;
    }>;
    viewQueueAudit?: () => void;
}
export declare class CollabIntelSidebarProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri;
    private readonly _callbacks;
    private _view?;
    constructor(_extensionUri: vscode.Uri, _callbacks: SidebarCallbacks);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    postMessage(message: any): void;
    /**
     * Load sidebar HTML template from external file src/ui/html/sidebar.html
     * with fallback resolution for compiled environment.
     */
    private _getHtmlForWebview;
}
