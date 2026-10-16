import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../storage/database';

// ─────────────────────────────────────────────────────────────────────────────
//  1-CLICK OFFLINE FAILSAFE EXPORT BUNDLE (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers telemetry.exportBundle / collabintel.exportBundle command
 * Allows volunteers to instantly dump their local SQLite database file to an exportable archive
 * when campus Wi-Fi or firewalls block communication with the backend.
 */
export function registerExportCommand(
  context: vscode.ExtensionContext,
  globalStoragePath: string
): vscode.Disposable {
  const handler = async () => {
    try {
      const dbFilePath = path.join(globalStoragePath, 'collabintel_telemetry.db');

      if (!fs.existsSync(dbFilePath)) {
        vscode.window.showErrorMessage(
          'No local telemetry database found. Perform some coding actions first to generate telemetry.'
        );
        return;
      }

      // Checkpoint WAL so all pending in-memory/WAL transactions are merged into the main .db file
      try {
        const db = getDatabase();
        if (db) {
          db.pragma('wal_checkpoint(PASSIVE)');
        }
      } catch (checkpointErr: any) {
        console.warn('[ExportBundle] WAL checkpoint notice:', checkpointErr.message);
      }

      const participantId = context.workspaceState.get<string>('telemetry_participant_id') || 'UNKNOWN';
      const taskCondition = context.workspaceState.get<string>('telemetry_task_condition') || 'TASK';
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
        } catch (_) {}
      }

      const fileSizeKb = Math.round(fs.statSync(targetUri.fsPath).size / 1024);

      vscode.window.showInformationMessage(
        `✅ Telemetry archive exported successfully (${fileSizeKb} KB) to: ${path.basename(targetUri.fsPath)}`
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(`Export failed: ${err.message}`);
    }
  };

  // Register both command aliases
  const d1 = vscode.commands.registerCommand('telemetry.exportBundle', handler);
  const d2 = vscode.commands.registerCommand('collabintel.exportBundle', handler);

  context.subscriptions.push(d1, d2);

  return {
    dispose: () => {
      d1.dispose();
      d2.dispose();
    }
  };
}
