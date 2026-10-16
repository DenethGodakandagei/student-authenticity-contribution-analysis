import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR CALLBACKS INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
export interface SidebarCallbacks {
  getTelemetrySnapshot: () => any;
  saveAndSyncSession: () => Promise<void>;
  openInteractiveDashboard: (tab?: string) => void;
  testBackendConnection: () => Promise<{ success: boolean; message: string }>;
  viewQueueAudit?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR WEBVIEW VIEW PROVIDER (Plan 6: External HTML Loading & Spec UI)
// ─────────────────────────────────────────────────────────────────────────────
export class CollabIntelSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _callbacks: SidebarCallbacks
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'requestState':
          this.postMessage({ type: 'updateState', state: this._callbacks.getTelemetrySnapshot() });
          break;
        case 'syncNow':
          await this._callbacks.saveAndSyncSession();
          vscode.window.showInformationMessage('✅ CollabIntel: Telemetry sync initiated.');
          break;
        case 'openDashboard':
          this._callbacks.openInteractiveDashboard();
          break;
        case 'viewQueueAudit':
          if (this._callbacks.viewQueueAudit) {
            this._callbacks.viewQueueAudit();
          } else {
            vscode.commands.executeCommand('collabintel.viewQueueStatus');
          }
          break;
        case 'testConnection':
          const testRes = await this._callbacks.testBackendConnection();
          if (testRes.success) vscode.window.showInformationMessage(`✅ ${testRes.message}`);
          else vscode.window.showErrorMessage(`❌ ${testRes.message}`);
          break;
        case 'openSetup':
          this._callbacks.openInteractiveDashboard('setup');
          break;
      }
    });

    setTimeout(() => {
      this.postMessage({ type: 'updateState', state: this._callbacks.getTelemetrySnapshot() });
    }, 200);
  }

  public postMessage(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Load sidebar HTML template from external file src/ui/html/sidebar.html
   * with fallback resolution for compiled environment.
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const candidatePaths = [
      path.join(this._extensionUri.fsPath, 'src', 'ui', 'html', 'sidebar.html'),
      path.join(this._extensionUri.fsPath, 'out', 'ui', 'html', 'sidebar.html'),
      path.join(__dirname, 'html', 'sidebar.html'),
      path.join(__dirname, '..', 'src', 'ui', 'html', 'sidebar.html')
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p, 'utf8');
        } catch (err) {
          console.error('[CollabIntel] Error reading sidebar HTML from', p, err);
        }
      }
    }

    // Emergency inline fallback
    return `<!DOCTYPE html><html><body><h3>CollabIntel Sidebar</h3><p>Could not locate sidebar.html template.</p></body></html>`;
  }
}
