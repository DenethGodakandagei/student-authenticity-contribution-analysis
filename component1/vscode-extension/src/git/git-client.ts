import * as child_process from 'child_process';
export { fetchLocalCommitsSince } from './commit-parser';

// ─────────────────────────────────────────────────────────────────────────────
//  GIT CLI HELPERS (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute a git command and return its trimmed standard output.
 */
export function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    child_process.exec(`git ${args.join(' ')}`, { cwd, timeout: 10000 }, (err, stdout) => {
      if (err) resolve('');
      else resolve(stdout.trim());
    });
  });
}

/**
 * Get the remote URL for 'origin'.
 */
export async function detectRepoRemoteUrl(workspaceRoot: string): Promise<string> {
  return runGit(['remote', 'get-url', 'origin'], workspaceRoot);
}

/**
 * Get the current HEAD commit hash.
 */
export async function getCurrentHeadHash(workspaceRoot: string): Promise<string> {
  return runGit(['rev-parse', 'HEAD'], workspaceRoot);
}

/**
 * Get the currently active branch name (git rev-parse --abbrev-ref HEAD).
 */
export async function getCurrentBranch(workspaceRoot: string): Promise<string> {
  return runGit(['rev-parse', '--abbrev-ref', 'HEAD'], workspaceRoot);
}

/**
 * Get the top-level repository root directory (git rev-parse --show-toplevel).
 */
export async function getRepoRoot(workspaceRoot: string): Promise<string> {
  const root = await runGit(['rev-parse', '--show-toplevel'], workspaceRoot);
  return root || workspaceRoot;
}
