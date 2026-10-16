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
exports.DocumentSensor = void 0;
const vscode = __importStar(require("vscode"));
const noise_filter_1 = require("../filters/noise-filter");
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
class DocumentSensor {
    constructor() {
        this._fileOpenCount = 0;
        this._saveCount = 0;
        this._openedFiles = new Set();
        this._disposables = [];
    }
    /**
     * Register document lifecycle listeners.
     */
    register(context, onActivity, onUpdate) {
        // ── File Open Tracking ─────────────────────────────────────────────
        const openDisposable = vscode.workspace.onDidOpenTextDocument((doc) => {
            if (doc.uri.scheme !== 'file')
                return;
            if (!(0, noise_filter_1.shouldTrackFile)(doc.uri))
                return;
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
    recordSave() {
        this._saveCount++;
    }
    /**
     * Get file open count.
     */
    get fileOpenCount() {
        return this._fileOpenCount;
    }
    /**
     * Get explicit save count.
     */
    get saveCount() {
        return this._saveCount;
    }
    /**
     * Get set of opened file paths.
     */
    get openedFiles() {
        return this._openedFiles;
    }
    /**
     * Reset all counters (on session reset).
     */
    reset() {
        this._fileOpenCount = 0;
        this._saveCount = 0;
        this._openedFiles.clear();
    }
    dispose() {
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables = [];
    }
}
exports.DocumentSensor = DocumentSensor;
//# sourceMappingURL=document.sensor.js.map