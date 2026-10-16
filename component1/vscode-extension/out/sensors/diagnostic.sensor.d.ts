import * as vscode from 'vscode';
import { DiagnosticSummary } from '../types';
/**
 * Tracks syntax errors, compiler warnings, error types,
 * and the time between error appearance and resolution.
 */
export declare class DiagnosticSensor {
    /** Active (unresolved) diagnostics keyed by unique identifier */
    private _activeDiagnostics;
    /** All resolved diagnostics (for computing avg resolution time) */
    private _resolvedDiagnostics;
    /** Running total of errors/warnings ever seen */
    private _totalErrorsSeen;
    private _totalWarningsSeen;
    private _disposable;
    /**
     * Register the onDidChangeDiagnostics listener.
     */
    register(context: vscode.ExtensionContext, onUpdate: () => void): void;
    /**
     * Get current diagnostic summary for telemetry snapshot.
     */
    getSummary(): DiagnosticSummary;
    /**
     * Reset all tracked diagnostics (on session reset).
     */
    reset(): void;
    dispose(): void;
}
