import { LocalCommit } from '../types';
/**
 * Fetch local commits since a given hash (or the latest 30 if no hash).
 * Parses commit metadata including author, authorEmail, branch refs, merge status,
 * and the list of files touched for reconciliation signature analysis.
 *
 * @param workspaceRoot Path to the root repository folder
 * @param sinceHash Optional starting commit hash
 * @returns Array of LocalCommit records and latest commit hash
 */
export declare function fetchLocalCommitsSince(workspaceRoot: string, sinceHash: string): Promise<{
    commits: LocalCommit[];
    latestHash: string;
}>;
