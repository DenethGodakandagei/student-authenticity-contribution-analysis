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
exports.DiagnosticSensor = void 0;
const vscode = __importStar(require("vscode"));
const noise_filter_1 = require("../filters/noise-filter");
// ─────────────────────────────────────────────────────────────────────────────
//  DIAGNOSTIC & COMPILER ERROR TRACKING SENSOR
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Tracks syntax errors, compiler warnings, error types,
 * and the time between error appearance and resolution.
 */
class DiagnosticSensor {
    constructor() {
        /** Active (unresolved) diagnostics keyed by unique identifier */
        this._activeDiagnostics = new Map();
        /** All resolved diagnostics (for computing avg resolution time) */
        this._resolvedDiagnostics = [];
        /** Running total of errors/warnings ever seen */
        this._totalErrorsSeen = 0;
        this._totalWarningsSeen = 0;
        this._disposable = null;
    }
    /**
     * Register the onDidChangeDiagnostics listener.
     */
    register(context, onUpdate) {
        this._disposable = vscode.languages.onDidChangeDiagnostics((event) => {
            const now = Date.now();
            for (const uri of event.uris) {
                // Only track diagnostics for files we're monitoring
                if (!(0, noise_filter_1.shouldTrackFile)(uri))
                    continue;
                const filePath = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
                const currentDiags = vscode.languages.getDiagnostics(uri);
                // Build a set of current diagnostic keys for this file
                const currentKeys = new Set();
                for (const diag of currentDiags) {
                    // Only track errors and warnings (skip info/hints)
                    if (diag.severity > vscode.DiagnosticSeverity.Warning)
                        continue;
                    const severity = diag.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning';
                    const code = typeof diag.code === 'object' ? diag.code.value : diag.code;
                    const key = `${filePath}:${diag.range.start.line}:${code || diag.message.slice(0, 50)}`;
                    currentKeys.add(key);
                    // If this is a new diagnostic, record its appearance
                    if (!this._activeDiagnostics.has(key)) {
                        const entry = {
                            key,
                            filePath,
                            severity,
                            code,
                            message: diag.message,
                            appearedAt: now,
                            source: diag.source
                        };
                        this._activeDiagnostics.set(key, entry);
                        if (severity === 'error')
                            this._totalErrorsSeen++;
                        else
                            this._totalWarningsSeen++;
                    }
                }
                // Check for resolved diagnostics (ones we were tracking that are no longer present)
                for (const [key, entry] of this._activeDiagnostics) {
                    if (entry.filePath === filePath && !currentKeys.has(key)) {
                        // This diagnostic was resolved
                        entry.resolvedAt = now;
                        this._resolvedDiagnostics.push(entry);
                        this._activeDiagnostics.delete(key);
                    }
                }
            }
            onUpdate();
        });
        context.subscriptions.push(this._disposable);
    }
    /**
     * Get current diagnostic summary for telemetry snapshot.
     */
    getSummary() {
        let currentErrorCount = 0;
        let currentWarningCount = 0;
        const activeErrors = [];
        for (const entry of this._activeDiagnostics.values()) {
            if (entry.severity === 'error') {
                currentErrorCount++;
                activeErrors.push(entry);
            }
            else {
                currentWarningCount++;
            }
        }
        // Compute average resolution time for errors
        const resolvedErrors = this._resolvedDiagnostics.filter(d => d.severity === 'error' && d.resolvedAt);
        let avgResolutionMs = 0;
        if (resolvedErrors.length > 0) {
            const totalMs = resolvedErrors.reduce((sum, d) => sum + ((d.resolvedAt || 0) - d.appearedAt), 0);
            avgResolutionMs = Math.round(totalMs / resolvedErrors.length);
        }
        return {
            currentErrorCount,
            currentWarningCount,
            totalErrorsSeen: this._totalErrorsSeen,
            totalWarningsSeen: this._totalWarningsSeen,
            resolvedErrors: resolvedErrors.length,
            avgResolutionMs,
            activeErrors
        };
    }
    /**
     * Reset all tracked diagnostics (on session reset).
     */
    reset() {
        this._activeDiagnostics.clear();
        this._resolvedDiagnostics = [];
        this._totalErrorsSeen = 0;
        this._totalWarningsSeen = 0;
    }
    dispose() {
        if (this._disposable) {
            this._disposable.dispose();
            this._disposable = null;
        }
    }
}
exports.DiagnosticSensor = DiagnosticSensor;
//# sourceMappingURL=diagnostic.sensor.js.map