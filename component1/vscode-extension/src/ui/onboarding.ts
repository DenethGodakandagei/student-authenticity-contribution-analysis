import * as vscode from 'vscode';
import { getConfig } from '../config/settings';

// ─────────────────────────────────────────────────────────────────────────────
//  PARTICIPANT ONBOARDING & EXPERIMENT SETUP (Dual-Mode: Real vs Experimental)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExperimentSession {
  participantId: string;
  taskCondition: 'TASK_A_MANUAL' | 'TASK_B_AI';
}

/**
 * Validates participant ID format (e.g. P01 through P20).
 */
export function validateParticipantId(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return 'Participant ID is required (e.g., P01 to P20)';
  }
  if (!/^P(0[1-9]|1[0-9]|20)$/.test(trimmed)) {
    return 'Format must be P01 - P20 (e.g. P01, P02... P20)';
  }
  return null;
}

/**
 * Ensure participant ID and task condition are initialized in workspaceState.
 * If in Real Mode, skips prompts completely.
 * If in Experimental Mode, prompts if not configured or allows verification.
 */
export async function ensureParticipantSession(
  context: vscode.ExtensionContext,
  forcePrompt = false
): Promise<ExperimentSession> {
  let participantId = context.workspaceState.get<string>('telemetry_participant_id');
  let taskCondition = context.workspaceState.get<'TASK_A_MANUAL' | 'TASK_B_AI'>('telemetry_task_condition');

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
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: '$(edit) Task A (Manual Human Coding)',
          description: 'Type code organically without AI assistance — Ground Truth Label 0',
          picked: taskCondition !== 'TASK_B_AI',
          value: 'TASK_A_MANUAL' as const
        },
        {
          label: '$(sparkle) Task B (AI-Assisted Coding)',
          description: 'Use AI LLM / ChatGPT / Claude / Copilot — Ground Truth Label 1',
          picked: taskCondition === 'TASK_B_AI',
          value: 'TASK_B_AI' as const
        }
      ],
      {
        title: `Task Condition for Participant ${participantId}`,
        placeHolder: 'Select active experimental task condition',
        ignoreFocusOut: true
      }
    );

    taskCondition = selected ? selected.value : (taskCondition || 'TASK_A_MANUAL');
    await context.workspaceState.update('telemetry_task_condition', taskCondition);
  }

  const taskLabel = taskCondition === 'TASK_A_MANUAL' ? 'Task A (Manual)' : 'Task B (AI-Assisted)';
  vscode.window.showInformationMessage(
    `INCODE Experimental Mode ACTIVE: Participant ${participantId} [${taskLabel}]`
  );

  return { participantId, taskCondition };
}

/**
 * Allow participants to switch task mode (e.g., when transitioning from Task A to Task B).
 */
export async function switchTaskCondition(
  context: vscode.ExtensionContext
): Promise<'TASK_A_MANUAL' | 'TASK_B_AI'> {
  const current = context.workspaceState.get<'TASK_A_MANUAL' | 'TASK_B_AI'>('telemetry_task_condition') || 'TASK_A_MANUAL';
  const participantId = context.workspaceState.get<string>('telemetry_participant_id') || 'P01';

  const selected = await vscode.window.showQuickPick(
    [
      {
        label: '$(edit) Task A (Manual Human Coding)',
        description: 'Genuine human coding (No AI allowed) — Ground Truth Label 0',
        picked: current === 'TASK_A_MANUAL',
        value: 'TASK_A_MANUAL' as const
      },
      {
        label: '$(sparkle) Task B (AI-Assisted Coding)',
        description: 'Web LLM / Copy-Paste / Copilot — Ground Truth Label 1',
        picked: current === 'TASK_B_AI',
        value: 'TASK_B_AI' as const
      }
    ],
    {
      title: `Switch Experimental Task Condition (Current: ${current === 'TASK_A_MANUAL' ? 'Task A' : 'Task B'})`,
      placeHolder: 'Select active task condition',
      ignoreFocusOut: true
    }
  );

  const newCondition = selected ? selected.value : current;
  await context.workspaceState.update('telemetry_task_condition', newCondition);

  const taskLabel = newCondition === 'TASK_A_MANUAL' ? 'Task A (Manual)' : 'Task B (AI-Assisted)';
  vscode.window.showInformationMessage(
    `INCODE: Switched to ${taskLabel} for Participant ${participantId}.`
  );

  return newCondition;
}

/**
 * Reconfigure participant ID and task mode manually.
 */
export async function reconfigureParticipant(
  context: vscode.ExtensionContext
): Promise<ExperimentSession> {
  const currentId = context.workspaceState.get<string>('telemetry_participant_id') || 'P01';
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

/**
 * Retrieve current experiment session state synchronously.
 */
export function getExperimentSession(context: vscode.ExtensionContext): ExperimentSession {
  const participantId = context.workspaceState.get<string>('telemetry_participant_id') || 'P01';
  const taskCondition = context.workspaceState.get<'TASK_A_MANUAL' | 'TASK_B_AI'>('telemetry_task_condition') || 'TASK_A_MANUAL';
  return { participantId, taskCondition };
}

/**
 * Interactive mode switcher allowing seamless toggle between Real Mode and Experimental Mode.
 */
export async function switchOperatingMode(
  context: vscode.ExtensionContext,
  onModeChanged?: (newMode: 'real' | 'experimental') => void
): Promise<'real' | 'experimental'> {
  const cfg = getConfig();
  const currentMode = cfg.operatingMode;

  const selected = await vscode.window.showQuickPick(
    [
      {
        label: '$(shield) Real Mode',
        description: 'Coursework assignment tracking with student credentials',
        picked: currentMode === 'real',
        value: 'real' as const
      },
      {
        label: '$(beaker) Experimental Mode',
        description: 'Research study pilot with Task A (Manual) & Task B (AI) ground truth tagging',
        picked: currentMode === 'experimental',
        value: 'experimental' as const
      }
    ],
    {
      title: `Operating Mode (Current: ${currentMode === 'real' ? 'Real Mode' : 'Experimental Mode'})`,
      placeHolder: 'Select INCODE operating mode',
      ignoreFocusOut: true
    }
  );

  if (selected) {
    const workspaceConfig = vscode.workspace.getConfiguration('collabintel');
    await workspaceConfig.update('operatingMode', selected.value, vscode.ConfigurationTarget.Global);

    if (selected.value === 'experimental') {
      await reconfigureParticipant(context);
    } else {
      vscode.window.showInformationMessage('INCODE: Switched to Real Mode (Coursework Tracking).');
    }

    if (onModeChanged) {
      onModeChanged(selected.value);
    }
    return selected.value;
  }

  return currentMode;
}
