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
exports.registerExportCommand = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const database_1 = require("../storage/database");
// ─────────────────────────────────────────────────────────────────────────────
//  1-CLICK OFFLINE FAILSAFE EXPORT BUNDLE (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Registers telemetry.exportBundle / collabintel.exportBundle command
 * Allows volunteers to instantly dump their local SQLite database file to an exportable archive
 * when campus Wi-Fi or firewalls block communication with the backend.
 */
function registerExportCommand(context, globalStoragePath) {
    const handler = async () => {
        try {
            const dbFilePath = path.join(globalStoragePath, 'collabintel_telemetry.db');
            if (!fs.existsSync(dbFilePath)) {
                vscode.window.showErrorMessage('No local telemetry database found. Perform some coding actions first to generate telemetry.');
                return;
            }
            // Checkpoint WAL so all pending in-memory/WAL transactions are merged into the main .db file
            try {
                const db = (0, database_1.getDatabase)();
                if (db) {
                    db.pragma('wal_checkpoint(PASSIVE)');
                }
            }
            catch (checkpointErr) {
                console.warn('[ExportBundle] WAL checkpoint notice:', checkpointErr.message);
            }
            const participantId = context.workspaceState.get('telemetry_participant_id') || 'UNKNOWN';
            const taskCondition = context.workspaceState.get('telemetry_task_condition') || 'TASK';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultExportName = `telemetry_${participantId}_${taskCondition}_${timestamp}.sqlite`;
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            const defaultUri = workspaceFolder
                ? vscode.Uri.file(path.join(workspaceFolder, defaultExportName))
                : undefined;
            const targetUri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    'SQLite Database': ['sqlite', 'db']
                },
                saveLabel: 'Export Telemetry Data'
            });
            if (!targetUri) {
                return; // User cancelled
            }
            // Copy primary database file
            fs.copyFileSync(dbFilePath, targetUri.fsPath);
            // Check if -wal file exists and copy alongside if present
            const walPath = dbFilePath + '-wal';
            if (fs.existsSync(walPath)) {
                try {
                    fs.copyFileSync(walPath, targetUri.fsPath + '-wal');
                }
                catch (_) { }
            }
            const fileSizeKb = Math.round(fs.statSync(targetUri.fsPath).size / 1024);
            vscode.window.showInformationMessage(`✅ Telemetry archive exported successfully (${fileSizeKb} KB) to: ${path.basename(targetUri.fsPath)}`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Export failed: ${err.message}`);
        }
    };
    // Register command aliases
    const d1 = vscode.commands.registerCommand('telemetry.exportBundle', handler);
    const d2 = vscode.commands.registerCommand('collabintel.exportBundle', handler);
    const d3 = vscode.commands.registerCommand('collabintel.exportLocalData', handler);
    context.subscriptions.push(d1, d2, d3);
    return {
        dispose: () => {
            d1.dispose();
            d2.dispose();
            d3.dispose();
        }
    };
}
exports.registerExportCommand = registerExportCommand;
//# sourceMappingURL=export-bundle.js.map