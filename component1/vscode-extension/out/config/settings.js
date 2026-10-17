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
exports.getConfig = exports.IDLE_TIMEOUT_MS = void 0;
const vscode = __importStar(require("vscode"));
// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
exports.IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle → pause session
// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG READER
// ─────────────────────────────────────────────────────────────────────────────
function getConfig() {
    const cfg = vscode.workspace.getConfiguration('collabintel');
    return {
        authToken: cfg.get('authToken') || '',
        assignmentId: cfg.get('assignmentId') || '',
        serverUrl: (cfg.get('serverUrl') || process.env.COLLABINTEL_SERVER_URL || 'https://student-authenticity-contribution-80jm.onrender.com').replace(/\/+$/, ''),
        syncIntervalMinutes: cfg.get('syncIntervalMinutes') || 5,
        trackOnlyLinkedRepo: cfg.get('trackOnlyLinkedRepo') ?? true,
    };
}
exports.getConfig = getConfig;
//# sourceMappingURL=settings.js.map