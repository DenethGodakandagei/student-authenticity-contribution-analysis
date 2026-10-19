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
exports.CollabIntelSidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR WEBVIEW VIEW PROVIDER (Plan 6: External HTML Loading & Spec UI)
// ─────────────────────────────────────────────────────────────────────────────
class CollabIntelSidebarProvider {
    constructor(_extensionUri, _callbacks) {
        this._extensionUri = _extensionUri;
        this._callbacks = _callbacks;
    }
    resolveWebviewView(webviewView, _context, _token) {
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
                    }
                    else {
                        vscode.commands.executeCommand('collabintel.viewQueueStatus');
                    }
                    break;
                case 'testConnection':
                    const testRes = await this._callbacks.testBackendConnection();
                    if (testRes.success)
                        vscode.window.showInformationMessage(`✅ ${testRes.message}`);
                    else
                        vscode.window.showErrorMessage(`❌ ${testRes.message}`);
                    break;
                case 'switchMode':
                    vscode.commands.executeCommand('collabintel.switchMode');
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
    postMessage(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
    /**
     * Load sidebar HTML template from external file src/ui/html/sidebar.html
     * with fallback resolution for compiled environment.
     */
    _getHtmlForWebview(webview) {
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
                }
                catch (err) {
                    console.error('[CollabIntel] Error reading sidebar HTML from', p, err);
                }
            }
        }
        // Emergency inline fallback
        return `<!DOCTYPE html><html><body><h3>CollabIntel Sidebar</h3><p>Could not locate sidebar.html template.</p></body></html>`;
    }
}
exports.CollabIntelSidebarProvider = CollabIntelSidebarProvider;
//# sourceMappingURL=sidebar-provider.js.map