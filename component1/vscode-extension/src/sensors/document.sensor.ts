import * as vscode from 'vscode';
import { shouldTrackFile } from '../filters/noise-filter';

// ─────────────────────────────────────────────────────────────────────────────
//  DOCUMENT LIFECYCLE SENSOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks document lifecycle events that were previously missing:
 *   - onDidOpenTextDocument (file opens)
 *   - Explicit save count (from onDidSaveTextDocument)
 * 
 * File create/delete remain in extension.ts as they update session state directly.
 */
export class DocumentSensor {
  private _fileOpenCount = 0;
  private _saveCount = 0;
  private _openedFiles = new Set<string>();
  private _disposables: vscode.Disposable[] = [];

  /**
   * Register document lifecycle listeners.
   */
  register(
    context: vscode.ExtensionContext,
    onActivity: () => void,
    onUpdate: () => void
  ): void {
    // ── File Open Tracking ─────────────────────────────────────────────
    const openDisposable = vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.uri.scheme !== 'file') return;
      if (!shouldTrackFile(doc.uri)) return;

      const rel = vscode.workspace.asRelativePath(doc.uri, false).replace(/\\/g, '/');

      // Only count unique opens (not re-opens of already-open docs)
      if (!this._openedFiles.has(rel)) {
        this._openedFiles.add(rel);
        this._fileOpenCount++;
        onActivity();
        onUpdate();
      }
    });

    this._disposables.push(openDisposable);
    context.subscriptions.push(openDisposable);
  }

  /**
   * Increment save count. Called from extension.ts save handler.
   */
  recordSave(): void {
    this._saveCount++;
  }

  /**
   * Get file open count.
   */
  get fileOpenCount(): number {
    return this._fileOpenCount;
  }

  /**
   * Get explicit save count.
   */
  get saveCount(): number {
    return this._saveCount;
  }

  /**
   * Get set of opened file paths.
   */
  get openedFiles(): Set<string> {
    return this._openedFiles;
  }

  /**
   * Reset all counters (on session reset).
   */
  reset(): void {
    this._fileOpenCount = 0;
    this._saveCount = 0;
    this._openedFiles.clear();
  }

  dispose(): void {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }
}
