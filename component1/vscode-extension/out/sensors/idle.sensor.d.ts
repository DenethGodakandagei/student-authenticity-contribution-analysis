import { IdleState, IdleSummary } from '../types';
/**
 * Implements a state machine that tracks active coding vs idle time.
 *
 * State transitions:
 *   ACTIVE → IDLE:  after 60 seconds of no activity
 *   IDLE → ACTIVE:  on any activity event (keystroke, save, focus, etc.)
 *
 * Maintains cumulative counters for:
 *   - activeCodingSeconds: total time spent in ACTIVE state
 *   - idleSeconds: total time spent in IDLE state
 *   - activeTypingSeconds: time during sustained keystroke activity
 */
export declare class IdleSensor {
    /** Inactivity threshold before transitioning to IDLE (ms) */
    static readonly IDLE_THRESHOLD_MS: number;
    private _state;
    private _lastActivityTime;
    private _lastStateChange;
    private _activeMs;
    private _idleMs;
    private _lastKeystrokeTime;
    private _typingSessionStart;
    private _activeTypingMs;
    /** Timer that checks for idle transitions */
    private _checkTimer;
    /**
     * Start the idle monitoring timer.
     * @param onIdleTransition Called when state changes (for session sync, status bar update)
     */
    start(onIdleTransition: (newState: IdleState) => void): void;
    /**
     * Report an activity event (keystroke, save, focus, etc.).
     * Transitions from IDLE → ACTIVE if needed.
     */
    reportActivity(): void;
    /**
     * Report a keystroke event specifically.
     * Used to track sustained typing duration separately from general activity.
     */
    reportKeystroke(): void;
    /**
     * Close the current typing session and accumulate its duration.
     */
    private _closeTypingSession;
    /**
     * Get the current idle/active summary.
     * Computes live cumulative values including the ongoing state period.
     */
    getSummary(): IdleSummary;
    /**
     * Current state.
     */
    get state(): IdleState;
    /**
     * Reset all counters (on session reset).
     */
    reset(): void;
    /**
     * Stop the idle monitoring timer.
     */
    dispose(): void;
}
