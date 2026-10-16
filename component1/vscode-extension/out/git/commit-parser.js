"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLocalCommitsSince = void 0;
const git_client_1 = require("./git-client");
// ─────────────────────────────────────────────────────────────────────────────
//  COMMIT PARSER (Plan 5)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fetch local commits since a given hash (or the latest 30 if no hash).
 * Parses commit metadata including author, authorEmail, branch refs, merge status,
 * and the list of files touched for reconciliation signature analysis.
 *
 * @param workspaceRoot Path to the root repository folder
 * @param sinceHash Optional starting commit hash
 * @returns Array of LocalCommit records and latest commit hash
 */
async function fetchLocalCommitsSince(workspaceRoot, sinceHash) {
    // Format: hash|||message|||date|||authorName|||authorEmail|||parents|||refs
    const format = '--format=%H|||%s|||%ai|||%an|||%ae|||%P|||%D';
    const range = sinceHash ? `${sinceHash}..HEAD` : '-30';
    const logRaw = await (0, git_client_1.runGit)(['log', sinceHash ? range : '', format, '-n', '30'], workspaceRoot);
    if (!logRaw)
        return { commits: [], latestHash: sinceHash };
    const commits = [];
    const lines = logRaw.split('\n').filter(l => l.includes('|||'));
    for (const line of lines) {
        const parts = line.split('|||');
        const hash = parts[0]?.trim();
        const message = parts[1]?.trim() || '';
        const date = parts[2]?.trim() || new Date().toISOString();
        const author = parts[3]?.trim() || '';
        const authorEmail = parts[4]?.trim() || '';
        const parents = parts[5]?.trim() || '';
        const refNames = parts[6]?.trim() || '';
        if (!hash || hash.length < 7)
            continue;
        // Detect merge commits (more than one parent hash)
        const isMerge = parents.split(/\s+/).filter(Boolean).length > 1;
        // Extract branch name from refNames if available
        let branch = '';
        const branchMatch = refNames.match(/HEAD -> ([^,\s]+)/) || refNames.match(/(?:origin\/)?([^,\s]+)/);
        if (branchMatch) {
            branch = branchMatch[1];
        }
        // Retrieve stat summary and changed file paths
        const statLine = await (0, git_client_1.runGit)(['show', '--stat', '--format=', hash], workspaceRoot);
        const filesRaw = await (0, git_client_1.runGit)(['show', '--name-only', '--format=', hash], workspaceRoot);
        const filesList = filesRaw
            .split('\n')
            .map(f => f.trim().replace(/\\/g, '/'))
            .filter(f => f.length > 0);
        let filesChanged = 0;
        let insertions = 0;
        let deletions = 0;
        const summaryMatch = statLine.match(/(\d+) file.*?(\d+) insertion.*?(\d+) deletion/);
        if (summaryMatch) {
            filesChanged = parseInt(summaryMatch[1], 10) || 0;
            insertions = parseInt(summaryMatch[2], 10) || 0;
            deletions = parseInt(summaryMatch[3], 10) || 0;
        }
        else {
            const fMatch = statLine.match(/(\d+) file/);
            if (fMatch)
                filesChanged = parseInt(fMatch[1], 10) || 0;
            const iMatch = statLine.match(/(\d+) insertion/);
            if (iMatch)
                insertions = parseInt(iMatch[1], 10) || 0;
            const dMatch = statLine.match(/(\d+) deletion/);
            if (dMatch)
                deletions = parseInt(dMatch[1], 10) || 0;
        }
        if (filesChanged === 0 && filesList.length > 0) {
            filesChanged = filesList.length;
        }
        commits.push({
            hash,
            message,
            date,
            filesChanged,
            insertions,
            deletions,
            author,
            authorEmail,
            branch: branch || undefined,
            isMerge,
            filesList
        });
    }
    const latestHash = commits.length > 0 ? commits[0].hash : sinceHash;
    return { commits, latestHash };
}
exports.fetchLocalCommitsSince = fetchLocalCommitsSince;
//# sourceMappingURL=commit-parser.js.map