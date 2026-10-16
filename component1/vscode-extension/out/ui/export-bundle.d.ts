import * as vscode from 'vscode';
/**
 * Registers telemetry.exportBundle / collabintel.exportBundle command
 * Allows volunteers to instantly dump their local SQLite database file to an exportable archive
 * when campus Wi-Fi or firewalls block communication with the backend.
 */
export declare function registerExportCommand(context: vscode.ExtensionContext, globalStoragePath: string): vscode.Disposable;
