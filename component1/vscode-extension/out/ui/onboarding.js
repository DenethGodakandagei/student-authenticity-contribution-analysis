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
exports.switchOperatingMode = exports.getExperimentSession = exports.reconfigureParticipant = exports.switchTaskCondition = exports.ensureParticipantSession = exports.validateParticipantId = void 0;
const vscode = __importStar(require("vscode"));
const settings_1 = require("../config/settings");
/**
 * Validates participant ID format (e.g. P01 through P20).
 */
function validateParticipantId(value) {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
        return 'Participant ID is required (e.g., P01 to P20)';
    }
    if (!/^P(0[1-9]|1[0-9]|20)$/.test(trimmed)) {
        return 'Format must be P01 - P20';
    }
    return null;
}
exports.validateParticipantId = validateParticipantId;
/**
 * Ensure participant ID and task condition are initialized in workspaceState.
 * If in Real Mode, skips prompts completely.
 * If in Experimental Mode, triggers modal prompts if not already configured.
 */
async function ensureParticipantSession(context) {
    const cfg = (0, settings_1.getConfig)();
    if (cfg.operatingMode === 'real') {
        // Real Academic Coursework Mode: Transparent background tracking, no experimental prompts.
        return {
            participantId: 'REAL_STUDENT',
            taskCondition: 'TASK_A_MANUAL'
        };
    }
    let participantId = context.workspaceState.get('telemetry_participant_id');
    let taskCondition = context.workspaceState.get('telemetry_task_condition');
    if (!participantId) {
        const input = await vscode.window.showInputBox({
            title: '🔬 Experiment Setup: Participant ID',
            prompt: 'Enter your assigned Participant Code (e.g., P01 to P20)',
            placeHolder: 'P01',
            ignoreFocusOut: true,
            validateInput: validateParticipantId
        });
        participantId = (input || 'P01').trim().toUpperCase();
        await context.workspaceState.update('telemetry_participant_id', participantId);
    }
    if (!taskCondition) {
        const selected = await vscode.window.showQuickPick([
            {
                label: 'Task A (Manual)',
                description: 'Genuine human coding (No AI allowed) — Ground Truth: Label 0',
                value: 'TASK_A_MANUAL'
            },
            {
                label: 'Task B (AI-Assisted)',
                description: 'Web LLM / Copy-Paste (ChatGPT/Claude Web) — Ground Truth: Label 1',
                value: 'TASK_B_AI'
            }
        ], {
            title: '🔬 Experiment Setup: Current Task Mode',
            placeHolder: 'Select your active experimental task condition',
            ignoreFocusOut: true
        });
        taskCondition = selected ? selected.value : 'TASK_A_MANUAL';
        await context.workspaceState.update('telemetry_task_condition', taskCondition);
    }
    vscode.window.showInformationMessage(`CollabIntel: Experiment active for ${participantId} [${taskCondition === 'TASK_A_MANUAL' ? 'Task A (Manual)' : 'Task B (AI-Assisted)'}]`);
    return { participantId, taskCondition };
}
exports.ensureParticipantSession = ensureParticipantSession;
/**
 * Allow participants to switch task mode (e.g., when transitioning from Task A to Task B).
 */
async function switchTaskCondition(context) {
    const current = context.workspaceState.get('telemetry_task_condition') || 'TASK_A_MANUAL';
    const participantId = context.workspaceState.get('telemetry_participant_id') || 'P01';
    const selected = await vscode.window.showQuickPick([
        {
            label: '$(edit) Task A (Manual)',
            description: 'Genuine human coding (No AI allowed) — Label 0',
            picked: current === 'TASK_A_MANUAL',
            value: 'TASK_A_MANUAL'
        },
        {
            label: '$(sparkle) Task B (AI-Assisted)',
            description: 'Web LLM / Copy-Paste — Label 1',
            picked: current === 'TASK_B_AI',
            value: 'TASK_B_AI'
        }
    ], {
        title: `Switch Experimental Task Condition (Current: ${current})`,
        placeHolder: 'Select the new task mode you are about to start',
        ignoreFocusOut: true
    });
    if (selected && selected.value !== current) {
        await context.workspaceState.update('telemetry_task_condition', selected.value);
        vscode.window.showInformationMessage(`Switched to ${selected.value === 'TASK_A_MANUAL' ? 'Task A (Manual)' : 'Task B (AI-Assisted)'} for ${participantId}`);
        return selected.value;
    }
    return current;
}
exports.switchTaskCondition = switchTaskCondition;
/**
 * Reconfigure participant ID and task mode manually.
 */
async function reconfigureParticipant(context) {
    const currentId = context.workspaceState.get('telemetry_participant_id') || 'P01';
    const input = await vscode.window.showInputBox({
        title: 'Update Participant ID',
        prompt: 'Enter assigned Participant Code (P01 to P20)',
        value: currentId,
        ignoreFocusOut: true,
        validateInput: validateParticipantId
    });
    if (input) {
        await context.workspaceState.update('telemetry_participant_id', input.trim().toUpperCase());
    }
    const updatedCondition = await switchTaskCondition(context);
    const updatedId = context.workspaceState.get('telemetry_participant_id') || 'P01';
    return { participantId: updatedId, taskCondition: updatedCondition };
}
exports.reconfigureParticipant = reconfigureParticipant;
/**
 * Retrieve current experiment session state synchronously.
 */
function getExperimentSession(context) {
    const participantId = context.workspaceState.get('telemetry_participant_id') || 'P01';
    const taskCondition = context.workspaceState.get('telemetry_task_condition') || 'TASK_A_MANUAL';
    return { participantId, taskCondition };
}
exports.getExperimentSession = getExperimentSession;
/**
 * Interactive mode switcher allowing seamless toggle between Real Mode and Experimental Mode.
 */
async function switchOperatingMode(context, onModeChanged) {
    const cfg = (0, settings_1.getConfig)();
    const currentMode = cfg.operatingMode;
    const selected = await vscode.window.showQuickPick([
        {
            label: '$(shield) Real Mode (Academic Coursework)',
            description: 'Track real coursework assignments for grading and lecturer verification',
            detail: 'Connects to your real student account, assignment ID, and repository.',
            picked: currentMode === 'real',
            value: 'real'
        },
        {
            label: '$(beaker) Experimental Mode (Research Study)',
            description: 'Participant P01-P20 study with Latin Square Task A/B tagging',
            detail: 'Enables ground-truth labeling (0 = Manual, 1 = AI) and dataset export.',
            picked: currentMode === 'experimental',
            value: 'experimental'
        }
    ], {
        title: `CollabIntel: Switch Operating Mode (Current: ${currentMode === 'real' ? 'Real Academic' : 'Experimental Study'})`,
        placeHolder: 'Select active mode for this VS Code session',
        ignoreFocusOut: true
    });
    if (selected && selected.value !== currentMode) {
        const workspaceConfig = vscode.workspace.getConfiguration('collabintel');
        await workspaceConfig.update('operatingMode', selected.value, vscode.ConfigurationTarget.Global);
        if (selected.value === 'experimental') {
            vscode.window.showInformationMessage('Switched to Experimental Study Mode. Initializing participant setup...');
            await ensureParticipantSession(context);
        }
        else {
            vscode.window.showInformationMessage('Switched to Real Academic Mode. Connected to your coursework tracking.');
        }
        if (onModeChanged) {
            onModeChanged(selected.value);
        }
        return selected.value;
    }
    return currentMode;
}
exports.switchOperatingMode = switchOperatingMode;
//# sourceMappingURL=onboarding.js.map