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
exports.getRepoRoot = exports.getCurrentBranch = exports.getCurrentHeadHash = exports.detectRepoRemoteUrl = exports.runGit = exports.fetchLocalCommitsSince = void 0;
const child_process = __importStar(require("child_process"));
var commit_parser_1 = require("./commit-parser");
Object.defineProperty(exports, "fetchLocalCommitsSince", { enumerable: true, get: function () { return commit_parser_1.fetchLocalCommitsSince; } });
// ─────────────────────────────────────────────────────────────────────────────
//  GIT CLI HELPERS (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Execute a git command and return its trimmed standard output.
 */
function runGit(args, cwd) {
    return new Promise((resolve) => {
        child_process.exec(`git ${args.join(' ')}`, { cwd, timeout: 10000 }, (err, stdout) => {
            if (err)
                resolve('');
            else
                resolve(stdout.trim());
        });
    });
}
exports.runGit = runGit;
/**
 * Get the remote URL for 'origin'.
 */
async function detectRepoRemoteUrl(workspaceRoot) {
    return runGit(['remote', 'get-url', 'origin'], workspaceRoot);
}
exports.detectRepoRemoteUrl = detectRepoRemoteUrl;
/**
 * Get the current HEAD commit hash.
 */
async function getCurrentHeadHash(workspaceRoot) {
    return runGit(['rev-parse', 'HEAD'], workspaceRoot);
}
exports.getCurrentHeadHash = getCurrentHeadHash;
/**
 * Get the currently active branch name (git rev-parse --abbrev-ref HEAD).
 */
async function getCurrentBranch(workspaceRoot) {
    return runGit(['rev-parse', '--abbrev-ref', 'HEAD'], workspaceRoot);
}
exports.getCurrentBranch = getCurrentBranch;
/**
 * Get the top-level repository root directory (git rev-parse --show-toplevel).
 */
async function getRepoRoot(workspaceRoot) {
    const root = await runGit(['rev-parse', '--show-toplevel'], workspaceRoot);
    return root || workspaceRoot;
}
exports.getRepoRoot = getRepoRoot;
//# sourceMappingURL=git-client.js.map