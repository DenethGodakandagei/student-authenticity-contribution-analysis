import * as vscode from 'vscode';
export declare function addToClipboardHistory(text: string): void;
export declare function refreshClipboardText(): Promise<string>;
export declare function isMatchingClipboard(insertedText: string, currentClip: string): boolean;
export declare function hasAiSignatures(text: string): boolean;
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
