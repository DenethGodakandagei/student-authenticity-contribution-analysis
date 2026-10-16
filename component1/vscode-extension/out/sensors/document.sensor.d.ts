import * as vscode from 'vscode';
/**
 * Tracks document lifecycle events that were previously missing:
 *   - onDidOpenTextDocument (file opens)
 *   - Explicit save count (from onDidSaveTextDocument)
 *
 * File create/delete remain in extension.ts as they update session state directly.
 */
export declare class DocumentSensor {
    private _fileOpenCount;
    private _saveCount;
    private _openedFiles;
    private _disposables;
    /**
     * Register document lifecycle listeners.
     */
    register(context: vscode.ExtensionContext, onActivity: () => void, onUpdate: () => void): void;
    /**
     * Increment save count. Called from extension.ts save handler.
     */
    recordSave(): void;
    /**
     * Get file open count.
     */
    get fileOpenCount(): number;
    /**
     * Get explicit save count.
     */
    get saveCount(): number;
    /**
     * Get set of opened file paths.
     */
    get openedFiles(): Set<string>;
    /**
     * Reset all counters (on session reset).
     */
    reset(): void;
    dispose(): void;
}
