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
        return 'Format must be P01 - P20 (e.g. P01, P02... P20)';
    }
    return null;
}
exports.validateParticipantId = validateParticipantId;
/**
 * Ensure participant ID and task condition are initialized in workspaceState.
 * If in Real Mode, skips prompts completely.
 * If in Experimental Mode, prompts if not configured or allows verification.
 */
async function ensureParticipantSession(context, forcePrompt = false) {
    let participantId = context.workspaceState.get('telemetry_participant_id');
    let taskCondition = context.workspaceState.get('telemetry_task_condition');
    if (!participantId || forcePrompt) {
        const input = await vscode.window.showInputBox({
            title: 'Participant ID (P01–P20)',
            prompt: 'Enter assigned research participant code',
            placeHolder: 'P01',
            value: participantId || 'P01',
            ignoreFocusOut: true,
            validateInput: validateParticipantId
        });
        participantId = (input || participantId || 'P01').trim().toUpperCase();
        await context.workspaceState.update('telemetry_participant_id', participantId);
    }
    if (!taskCondition || forcePrompt) {
        const selected = await vscode.window.showQuickPick([
            {
                label: '$(edit) Task A (Manual Human Coding)',
                description: 'Type code organically without AI assistance — Ground Truth Label 0',
                picked: taskCondition !== 'TASK_B_AI',
                value: 'TASK_A_MANUAL'
            },
            {
                label: '$(sparkle) Task B (AI-Assisted Coding)',
                description: 'Use AI LLM / ChatGPT / Claude / Copilot — Ground Truth Label 1',
                picked: taskCondition === 'TASK_B_AI',
                value: 'TASK_B_AI'
            }
        ], {
            title: `Task Condition for Participant ${participantId}`,
            placeHolder: 'Select active experimental task condition',
            ignoreFocusOut: true
        });
        taskCondition = selected ? selected.value : (taskCondition || 'TASK_A_MANUAL');
        await context.workspaceState.update('telemetry_task_condition', taskCondition);
    }
    const taskLabel = taskCondition === 'TASK_A_MANUAL' ? 'Task A (Manual)' : 'Task B (AI-Assisted)';
    vscode.window.showInformationMessage(`INCODE Experimental Mode ACTIVE: Participant ${participantId} [${taskLabel}]`);
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
            label: '$(edit) Task A (Manual Human Coding)',
            description: 'Genuine human coding (No AI allowed) — Ground Truth Label 0',
            picked: current === 'TASK_A_MANUAL',
            value: 'TASK_A_MANUAL'
        },
        {
            label: '$(sparkle) Task B (AI-Assisted Coding)',
            description: 'Web LLM / Copy-Paste / Copilot — Ground Truth Label 1',
            picked: current === 'TASK_B_AI',
            value: 'TASK_B_AI'
        }
    ], {
        title: `Switch Experimental Task Condition (Current: ${current === 'TASK_A_MANUAL' ? 'Task A' : 'Task B'})`,
        placeHolder: 'Select active task condition',
        ignoreFocusOut: true
    });
    const newCondition = selected ? selected.value : current;
    await context.workspaceState.update('telemetry_task_condition', newCondition);
    const taskLabel = newCondition === 'TASK_A_MANUAL' ? 'Task A (Manual)' : 'Task B (AI-Assisted)';
    vscode.window.showInformationMessage(`INCODE: Switched to ${taskLabel} for Participant ${participantId}.`);
    return newCondition;
}
exports.switchTaskCondition = switchTaskCondition;
/**
 * Reconfigure participant ID and task mode manually.
 */
async function reconfigureParticipant(context) {
    const currentId = context.workspaceState.get('telemetry_participant_id') || 'P01';
    const input = await vscode.window.showInputBox({
        title: 'Participant Setup (P01–P20)',
        prompt: 'Enter assigned Participant Code (e.g. P01 to P20)',
        value: currentId,
        ignoreFocusOut: true,
        validateInput: validateParticipantId
    });
    const chosenId = (input || currentId).trim().toUpperCase();
    await context.workspaceState.update('telemetry_participant_id', chosenId);
    const updatedCondition = await switchTaskCondition(context);
    return { participantId: chosenId, taskCondition: updatedCondition };
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
            label: '$(shield) Real Mode',
            description: 'Coursework assignment tracking with student credentials',
            picked: currentMode === 'real',
            value: 'real'
        },
        {
            label: '$(beaker) Experimental Mode',
            description: 'Research study pilot with Task A (Manual) & Task B (AI) ground truth tagging',
            picked: currentMode === 'experimental',
            value: 'experimental'
        }
    ], {
        title: `Operating Mode (Current: ${currentMode === 'real' ? 'Real Mode' : 'Experimental Mode'})`,
        placeHolder: 'Select INCODE operating mode',
        ignoreFocusOut: true
    });
    if (selected) {
        const workspaceConfig = vscode.workspace.getConfiguration('collabintel');
        await workspaceConfig.update('operatingMode', selected.value, vscode.ConfigurationTarget.Global);
        if (selected.value === 'experimental') {
            await reconfigureParticipant(context);
        }
        else {
            vscode.window.showInformationMessage('INCODE: Switched to Real Mode (Coursework Tracking).');
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