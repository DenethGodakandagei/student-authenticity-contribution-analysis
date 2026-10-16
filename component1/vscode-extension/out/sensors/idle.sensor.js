"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdleSensor = void 0;
// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVE VS IDLE STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
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
class IdleSensor {
    constructor() {
        this._state = 'ACTIVE';
        this._lastActivityTime = Date.now();
        this._lastStateChange = Date.now();
        // Cumulative duration trackers (in ms, converted to seconds on read)
        this._activeMs = 0;
        this._idleMs = 0;
        // Typing-specific tracking
        this._lastKeystrokeTime = 0;
        this._typingSessionStart = 0;
        this._activeTypingMs = 0;
        /** Timer that checks for idle transitions */
        this._checkTimer = null;
    }
    /**
     * Start the idle monitoring timer.
     * @param onIdleTransition Called when state changes (for session sync, status bar update)
     */
    start(onIdleTransition) {
        // Check every 10 seconds for idle transition
        this._checkTimer = setInterval(() => {
            const now = Date.now();
            const elapsed = now - this._lastActivityTime;
            if (this._state === 'ACTIVE' && elapsed >= IdleSensor.IDLE_THRESHOLD_MS) {
                // Accumulate active time up to the point activity stopped
                this._activeMs += (this._lastActivityTime - this._lastStateChange);
                // Close any open typing session
                this._closeTypingSession(this._lastActivityTime);
                this._state = 'IDLE';
                this._lastStateChange = now;
                onIdleTransition('IDLE');
            }
        }, 10000);
    }
    /**
     * Report an activity event (keystroke, save, focus, etc.).
     * Transitions from IDLE → ACTIVE if needed.
     */
    reportActivity() {
        const now = Date.now();
        this._lastActivityTime = now;
        if (this._state === 'IDLE') {
            // Accumulate idle time
            this._idleMs += (now - this._lastStateChange);
            this._state = 'ACTIVE';
            this._lastStateChange = now;
        }
    }
    /**
     * Report a keystroke event specifically.
     * Used to track sustained typing duration separately from general activity.
     */
    reportKeystroke() {
        const now = Date.now();
        this.reportActivity();
        // If no recent keystroke or gap > 2s, start a new typing session
        if (this._lastKeystrokeTime === 0 || (now - this._lastKeystrokeTime) > 2000) {
            this._closeTypingSession(this._lastKeystrokeTime || now);
            this._typingSessionStart = now;
        }
        this._lastKeystrokeTime = now;
    }
    /**
     * Close the current typing session and accumulate its duration.
     */
    _closeTypingSession(endTime) {
        if (this._typingSessionStart > 0 && endTime > this._typingSessionStart) {
            this._activeTypingMs += (endTime - this._typingSessionStart);
        }
        this._typingSessionStart = 0;
    }
    /**
     * Get the current idle/active summary.
     * Computes live cumulative values including the ongoing state period.
     */
    getSummary() {
        const now = Date.now();
        let activeMs = this._activeMs;
        let idleMs = this._idleMs;
        let typingMs = this._activeTypingMs;
        // Add the duration of the current ongoing state
        const currentStateDuration = now - this._lastStateChange;
        if (this._state === 'ACTIVE') {
            activeMs += currentStateDuration;
        }
        else {
            idleMs += currentStateDuration;
        }
        // If there's an open typing session, add its duration
        if (this._typingSessionStart > 0 && this._lastKeystrokeTime > this._typingSessionStart) {
            typingMs += (this._lastKeystrokeTime - this._typingSessionStart);
        }
        return {
            state: this._state,
            activeCodingSeconds: Math.round(activeMs / 1000),
            idleSeconds: Math.round(idleMs / 1000),
            activeTypingSeconds: Math.round(typingMs / 1000),
            lastStateChange: this._lastStateChange
        };
    }
    /**
     * Current state.
     */
    get state() {
        return this._state;
    }
    /**
     * Reset all counters (on session reset).
     */
    reset() {
        const now = Date.now();
        this._state = 'ACTIVE';
        this._lastActivityTime = now;
        this._lastStateChange = now;
        this._activeMs = 0;
        this._idleMs = 0;
        this._lastKeystrokeTime = 0;
        this._typingSessionStart = 0;
        this._activeTypingMs = 0;
    }
    /**
     * Stop the idle monitoring timer.
     */
    dispose() {
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
            this._checkTimer = null;
        }
    }
}
exports.IdleSensor = IdleSensor;
/** Inactivity threshold before transitioning to IDLE (ms) */
IdleSensor.IDLE_THRESHOLD_MS = 60 * 1000; // 60 seconds per spec
//# sourceMappingURL=idle.sensor.js.map