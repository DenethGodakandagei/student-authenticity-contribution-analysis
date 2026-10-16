import * as vscode from 'vscode';
import { FocusSummary } from '../types';
/**
 * Tracks window blur/focus events and tab (active editor) switches
 * to evaluate context switching and multitasking behaviour.
 */
export declare class FocusSensor {
    private _focusTransitions;
    private _tabSwitches;
    private _isFocused;
    private _lastFocusTime;
    private _lastBlurTime;
    private _windowStateDisposable;
    private _tabSwitchDisposable;
    /**
     * Register window state and active editor change listeners.
     */
    register(context: vscode.ExtensionContext, onActivity: () => void, onUpdate: () => void): void;
    /**
     * Get current focus summary for telemetry snapshot.
     */
    getSummary(): FocusSummary;
    /**
     * Whether the VS Code window is currently focused.
     */
    get isFocused(): boolean;
    /**
     * Reset all counters (on session reset).
     */
    reset(): void;
    dispose(): void;
}
