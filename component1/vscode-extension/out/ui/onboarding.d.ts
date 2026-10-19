import * as vscode from 'vscode';
export interface ExperimentSession {
    participantId: string;
    taskCondition: 'TASK_A_MANUAL' | 'TASK_B_AI';
}
/**
 * Validates participant ID format (e.g. P01 through P20).
 */
export declare function validateParticipantId(value: string): string | null;
/**
 * Ensure participant ID and task condition are initialized in workspaceState.
 * If in Real Mode, skips prompts completely.
 * If in Experimental Mode, triggers modal prompts if not already configured.
 */
export declare function ensureParticipantSession(context: vscode.ExtensionContext): Promise<ExperimentSession>;
/**
 * Allow participants to switch task mode (e.g., when transitioning from Task A to Task B).
 */
export declare function switchTaskCondition(context: vscode.ExtensionContext): Promise<'TASK_A_MANUAL' | 'TASK_B_AI'>;
/**
 * Reconfigure participant ID and task mode manually.
 */
export declare function reconfigureParticipant(context: vscode.ExtensionContext): Promise<ExperimentSession>;
/**
 * Retrieve current experiment session state synchronously.
 */
export declare function getExperimentSession(context: vscode.ExtensionContext): ExperimentSession;
/**
 * Interactive mode switcher allowing seamless toggle between Real Mode and Experimental Mode.
 */
export declare function switchOperatingMode(context: vscode.ExtensionContext, onModeChanged?: (newMode: 'real' | 'experimental') => void): Promise<'real' | 'experimental'>;
