import * as vscode from 'vscode';
import { refreshClipboardText, isMatchingClipboard, addToClipboardHistory } from './utils/clipboard-tracker';
export { refreshClipboardText, isMatchingClipboard, addToClipboardHistory };
export declare function hasAiSignatures(text: string): boolean;
export declare function isAiExtensionActive(): boolean;
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
