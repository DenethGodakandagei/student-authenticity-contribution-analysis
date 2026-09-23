import * as vscode from 'vscode';
import { FocusSummary } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  FOCUS & WINDOW STATE SENSOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks window blur/focus events and tab (active editor) switches
 * to evaluate context switching and multitasking behaviour.
 */
export class FocusSensor {
  private _focusTransitions = 0;
  private _tabSwitches = 0;
  private _isFocused = true;
  private _lastFocusTime = Date.now();
  private _lastBlurTime = 0;

  private _windowStateDisposable: vscode.Disposable | null = null;
  private _tabSwitchDisposable: vscode.Disposable | null = null;

  /**
   * Register window state and active editor change listeners.
   */
  register(
    context: vscode.ExtensionContext,
    onActivity: () => void,
    onUpdate: () => void
  ): void {
    // ── Window Focus/Blur ──────────────────────────────────────────────
    this._windowStateDisposable = vscode.window.onDidChangeWindowState((state) => {
      const now = Date.now();

      if (state.focused && !this._isFocused) {
        // Window regained focus (blur → focus transition)
        this._isFocused = true;
        this._lastFocusTime = now;
        this._focusTransitions++;
        onActivity();
      } else if (!state.focused && this._isFocused) {
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
  getSummary(): FocusSummary {
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
  get isFocused(): boolean {
    return this._isFocused;
  }

  /**
   * Reset all counters (on session reset).
   */
  reset(): void {
    this._focusTransitions = 0;
    this._tabSwitches = 0;
    this._isFocused = true;
    this._lastFocusTime = Date.now();
    this._lastBlurTime = 0;
  }

  dispose(): void {
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
