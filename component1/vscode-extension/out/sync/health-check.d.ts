export type HealthChangeListener = (isOnline: boolean, previousState: boolean) => void;
export declare class HealthCheckMonitor {
    private isOnlineState;
    private pollIntervalMs;
    private timer;
    private serverUrl;
    private listeners;
    private hasPerformedFirstCheck;
    constructor(defaultIntervalMs?: number);
    /**
     * Current online status of the backend server.
     */
    isOnline(): boolean;
    /**
     * Register a listener for status transitions.
     */
    onStatusChange(listener: HealthChangeListener): {
        dispose: () => void;
    };
    /**
     * Start 15s health check polling.
     */
    start(serverUrl: string, intervalMs?: number): void;
    /**
     * Stop health check polling.
     */
    stop(): void;
    /**
     * Perform an on-demand GET /api/health check.
     */
    checkHealthNow(): Promise<boolean>;
    /**
     * Internal state transition handler.
     */
    private updateState;
}
export declare const defaultHealthCheckMonitor: HealthCheckMonitor;
