export { fetchLocalCommitsSince } from './commit-parser';
/**
 * Execute a git command and return its trimmed standard output.
 */
export declare function runGit(args: string[], cwd: string): Promise<string>;
/**
 * Get the remote URL for 'origin'.
 */
export declare function detectRepoRemoteUrl(workspaceRoot: string): Promise<string>;
/**
 * Get the current HEAD commit hash.
 */
export declare function getCurrentHeadHash(workspaceRoot: string): Promise<string>;
/**
 * Get the currently active branch name (git rev-parse --abbrev-ref HEAD).
 */
export declare function getCurrentBranch(workspaceRoot: string): Promise<string>;
/**
 * Get the top-level repository root directory (git rev-parse --show-toplevel).
 */
export declare function getRepoRoot(workspaceRoot: string): Promise<string>;
