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
exports.FocusSensor = void 0;
const vscode = __importStar(require("vscode"));
// ─────────────────────────────────────────────────────────────────────────────
//  FOCUS & WINDOW STATE SENSOR
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Tracks window blur/focus events and tab (active editor) switches
 * to evaluate context switching and multitasking behaviour.
 */
class FocusSensor {
    constructor() {
        this._focusTransitions = 0;
        this._tabSwitches = 0;
        this._isFocused = true;
        this._lastFocusTime = Date.now();
        this._lastBlurTime = 0;
        this._windowStateDisposable = null;
        this._tabSwitchDisposable = null;
    }
    /**
     * Register window state and active editor change listeners.
     */
    register(context, onActivity, onUpdate) {
        // ── Window Focus/Blur ──────────────────────────────────────────────
        this._windowStateDisposable = vscode.window.onDidChangeWindowState((state) => {
            const now = Date.now();
            if (state.focused && !this._isFocused) {
                // Window regained focus (blur → focus transition)
                this._isFocused = true;
                this._lastFocusTime = now;
                this._focusTransitions++;
                onActivity();
            }
            else if (!state.focused && this._isFocused) {
                // Window lost focus (focus → blur)
                this._isFocused = false;
                this._lastBlurTime = now;
            }
            onUpdate();
        });
        // ── Tab / Active Editor Switches ───────────────────────────────────
        this._tabSwitchDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.uri.scheme === 'file') {
                this._tabSwitches++;
                onActivity();
                onUpdate();
            }
        });
        context.subscriptions.push(this._windowStateDisposable);
        context.subscriptions.push(this._tabSwitchDisposable);
    }
    /**
     * Get current focus summary for telemetry snapshot.
     */
    getSummary() {
        return {
            focusTransitions: this._focusTransitions,
            tabSwitches: this._tabSwitches,
            isFocused: this._isFocused,
            lastFocusTime: this._lastFocusTime,
            lastBlurTime: this._lastBlurTime
        };
    }
    /**
     * Whether the VS Code window is currently focused.
     */
    get isFocused() {
        return this._isFocused;
    }
    /**
     * Reset all counters (on session reset).
     */
    reset() {
        this._focusTransitions = 0;
        this._tabSwitches = 0;
        this._isFocused = true;
        this._lastFocusTime = Date.now();
        this._lastBlurTime = 0;
    }
    dispose() {
        if (this._windowStateDisposable) {
            this._windowStateDisposable.dispose();
            this._windowStateDisposable = null;
        }
        if (this._tabSwitchDisposable) {
            this._tabSwitchDisposable.dispose();
            this._tabSwitchDisposable = null;
        }
    }
}
exports.FocusSensor = FocusSensor;
//# sourceMappingURL=focus.sensor.js.map