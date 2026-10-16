/**
 * Git Repository Validator
 * Inspects hidden .git/config and .git/HEAD in local physical directories
 * to attest whether the selected local directory matches the linked remote GitHub repo.
 */

export interface GitVerificationResult {
  hasGitDir: boolean;
  localRemoteUrl: string | null;
  expectedRepoUrl: string | null;
  isMatch: boolean;
  matchedSlug: string | null; // e.g., "facebook/react"
  localBranch: string | null;
  error?: string | null;
  status: 'matched' | 'mismatch' | 'no_git' | 'unlinked';
  message: string;
}

/**
 * Extracts a normalized owner/repo slug from any Git URL format:
 * - https://github.com/owner/repo.git
 * - http://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * - ssh://git@github.com/owner/repo.git
 * - https://gitlab.com/owner/repo.git
 */
export function normalizeGitSlug(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    let cleaned = rawUrl.trim();
    // Strip trailing .git and trailing slashes
    cleaned = cleaned.replace(/\.git\/?$/i, '').replace(/\/+$/, '');

    // SSH format: git@github.com:owner/repo
    const sshMatch = cleaned.match(/^[a-zA-Z0-9_\-]+@[a-zA-Z0-9_.\-]+:([^\/]+)\/([^\/]+)$/);
    if (sshMatch) {
      return `${sshMatch[1]}/${sshMatch[2]}`.toLowerCase();
    }

    // Standard HTTP/HTTPS or SSH with protocol URL
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('ssh://')) {
      const parsed = new URL(cleaned);
      const pathParts = parsed.pathname.replace(/^\/+/, '').split('/');
      if (pathParts.length >= 2) {
        return `${pathParts[0]}/${pathParts[1]}`.toLowerCase();
      }
    }

    // Direct owner/repo format
    const directParts = cleaned.split('/');
    if (directParts.length === 2 && !cleaned.includes(':')) {
      return `${directParts[0]}/${directParts[1]}`.toLowerCase();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Inspects a FileSystemDirectoryHandle to read .git/config and .git/HEAD
 */
export async function verifyLocalGitRepository(
  dirHandle: any,
  expectedRepoUrl: string | null | undefined
): Promise<GitVerificationResult> {
  if (!dirHandle) {
    return {
      hasGitDir: false,
      localRemoteUrl: null,
      expectedRepoUrl: expectedRepoUrl || null,
      isMatch: false,
      matchedSlug: null,
      localBranch: null,
      status: 'no_git',
      message: 'No directory handle provided.'
    };
  }

  try {
    let gitDirHandle: any = null;
    try {
      gitDirHandle = await dirHandle.getDirectoryHandle('.git');
    } catch {
      // .git directory does not exist or cannot be accessed
    }

    if (!gitDirHandle) {
      return {
        hasGitDir: false,
        localRemoteUrl: null,
        expectedRepoUrl: expectedRepoUrl || null,
        isMatch: false,
        matchedSlug: null,
        localBranch: null,
        status: 'no_git',
        message: `No hidden .git folder found in "${dirHandle.name}". Please ensure this folder is an initialized/cloned Git repository.`
      };
    }

    // 1. Read .git/config
    let configText = '';
    try {
      const configFileHandle = await gitDirHandle.getFileHandle('config');
      const configFile = await configFileHandle.getFile();
      configText = await configFile.text();
    } catch (err: any) {
      console.warn('Could not read .git/config:', err);
    }

    // 2. Read .git/HEAD (to determine current branch)
    let localBranch: string | null = null;
    try {
      const headFileHandle = await gitDirHandle.getFileHandle('HEAD');
      const headFile = await headFileHandle.getFile();
      const headText = await headFile.text();
      const branchMatch = headText.match(/ref:\s*refs\/heads\/([^\r\n]+)/);
      if (branchMatch) {
        localBranch = branchMatch[1].trim();
      } else if (headText.trim().length === 40) {
        localBranch = headText.trim().substring(0, 7); // Detached HEAD SHA
      }
    } catch {
      // Non-critical if HEAD cannot be read
    }

    // 3. Extract remote URL from .git/config
    let localRemoteUrl: string | null = null;
    if (configText) {
      // Look for [remote "origin"] url = ... or any [remote "..."] url = ...
      const remoteOriginMatch = configText.match(/\[remote\s+"origin"\][\s\S]*?url\s*=\s*([^\r\n]+)/i);
      if (remoteOriginMatch) {
        localRemoteUrl = remoteOriginMatch[1].trim();
      } else {
        const anyRemoteMatch = configText.match(/\[remote\s+"[^"]+"\][\s\S]*?url\s*=\s*([^\r\n]+)/i);
        if (anyRemoteMatch) {
          localRemoteUrl = anyRemoteMatch[1].trim();
        }
      }
    }

    const localSlug = normalizeGitSlug(localRemoteUrl);
    const expectedSlug = normalizeGitSlug(expectedRepoUrl);

    // Case 1: Team has no repo URL linked yet
    if (!expectedRepoUrl || !expectedSlug) {
      return {
        hasGitDir: true,
        localRemoteUrl,
        expectedRepoUrl: expectedRepoUrl || null,
        isMatch: true,
        matchedSlug: localSlug,
        localBranch,
        status: 'unlinked',
        message: localRemoteUrl 
          ? `Local Git repository detected (${localRemoteUrl}). Team repository has not been set yet.` 
          : `Local Git repository detected with no remote origins.`
      };
    }

    // Case 2: Matching repository
    if (localSlug && expectedSlug && localSlug === expectedSlug) {
      return {
        hasGitDir: true,
        localRemoteUrl,
        expectedRepoUrl,
        isMatch: true,
        matchedSlug: localSlug,
        localBranch,
        status: 'matched',
        message: `Verified Match: Local folder repository (${localSlug}) matches team GitHub repository.`
      };
    }

    // Case 3: Mismatched repository
    return {
      hasGitDir: true,
      localRemoteUrl,
      expectedRepoUrl,
      isMatch: false,
      matchedSlug: null,
      localBranch,
      status: 'mismatch',
      message: `Repository Mismatch: The selected folder is linked to "${localRemoteUrl || 'unspecified remote'}" (${localSlug || 'unknown'}), but the assignment expects "${expectedRepoUrl}" (${expectedSlug}).`
    };
  } catch (err: any) {
    return {
      hasGitDir: false,
      localRemoteUrl: null,
      expectedRepoUrl: expectedRepoUrl || null,
      isMatch: false,
      matchedSlug: null,
      localBranch: null,
      error: err.message,
      status: 'no_git',
      message: `Error verifying local .git repository: ${err.message}`
    };
  }
}
