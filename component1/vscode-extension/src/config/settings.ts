import * as vscode from 'vscode';
import { ExtConfig } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle → pause session

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG READER
// ─────────────────────────────────────────────────────────────────────────────
export function getConfig(): ExtConfig {
  const cfg = vscode.workspace.getConfiguration('collabintel');
  return {
    authToken: cfg.get<string>('authToken') || '',
    assignmentId: cfg.get<string>('assignmentId') || '',
    serverUrl: (cfg.get<string>('serverUrl') || process.env.COLLABINTEL_SERVER_URL || 'https://student-authenticity-contribution-80jm.onrender.com').replace(/\/+$/, ''),
    syncIntervalMinutes: cfg.get<number>('syncIntervalMinutes') || 5,
    trackOnlyLinkedRepo: cfg.get<boolean>('trackOnlyLinkedRepo') ?? true,
    operatingMode: (cfg.get<string>('operatingMode') as 'real' | 'experimental') || 'real',
  };
}
