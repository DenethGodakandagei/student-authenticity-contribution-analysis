import * as vscode from 'vscode';
import { EventCategory } from '../types';
/**
 * Normalizes a file system path for case-insensitive cross-platform comparison (especially on Windows).
 */
export declare function normalizeFsPath(p: string): string;
/**
 * Check if a URI is inside the current workspace.
 * Case-insensitive comparison ensures Windows drive letters ('f:' vs 'F:') match properly.
 */
export declare function isInsideWorkspace(uri: vscode.Uri): boolean;
/**
 * Determine if a file should be tracked for telemetry.
 * Enforces: workspace check, directory blacklist, lockfile suppression.
 */
export declare function shouldTrackFile(uri: vscode.Uri): boolean;
/**
 * Verify that the document being edited matches the active text editor.
 * Uses case-insensitive normalized path matching so Windows drive letters match reliably.
 */
export declare function isActiveDocument(uri: vscode.Uri): boolean;
/**
 * Categorize a file by its type for metrics separation.
 */
export declare function categorizeFile(uri: vscode.Uri): EventCategory;
/**
 * Full filtering pipeline: should track + is active editor.
 * Use this for keystroke/edit events where background writes should be discarded.
 */
export declare function shouldTrackEdit(uri: vscode.Uri): boolean;
