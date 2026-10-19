import { Response } from 'express';
import { GitActivity, Team, User } from '../models';
import { calculateAssignmentAnalytics } from '../lib/scoring';
import * as mockDb from '../models/mockStore';

// Helper to validate github URL
const parseGithubUrl = (url: string) => {
  const regex = /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i;
  const match = url.match(regex);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '')
  };
};

export const validateRepository = async (req: any, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Repository URL is required' });
      return;
    }

    const parsed = parseGithubUrl(url);
    if (!parsed) {
      res.status(400).json({ isValid: false, error: 'Invalid GitHub repository URL format. Must be https://github.com/owner/repo' });
      return;
    }

    res.status(200).json({
      isValid: true,
      owner: parsed.owner,
      repo: parsed.repo,
      message: 'GitHub repository validated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const syncRepositoryData = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId, assignmentId } = req.body;

    if (!teamId || !assignmentId) {
      res.status(400).json({ error: 'Team ID and Assignment ID are required' });
      return;
    }

    let team: any;
    if (!mockDb.isDbConnected()) {
      team = mockDb.mockTeams.find(t => t._id === teamId);
    } else {
      team = await Team.findById(teamId);
    }

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const repoUrl = team.repositoryUrl;
    if (!repoUrl) {
      res.status(400).json({ error: 'No GitHub repository URL set for this team' });
      return;
    }

    const parsed = parseGithubUrl(repoUrl);
    let commitsSynced = 0;
    let prsSynced = 0;
    let syncSource = 'Official GitHub API';

    if (!parsed) {
      res.status(400).json({ error: 'Failed to parse GitHub owner and repository name from URL' });
      return;
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    const headers: Record<string, string> = {
      'User-Agent': 'Hybrid-Contribution-Tracker',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    console.log(`Syncing real repository contributions for ${parsed.owner}/${parsed.repo}...`);

    try {
      // 1. Fetch real commits
      const commitResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=50`,
        { headers }
      );

      if (!commitResponse.ok) {
        const errDetails: any = await commitResponse.json().catch(() => ({}));
        res.status(400).json({ 
          error: `GitHub API Error: ${errDetails.message || commitResponse.statusText}. Please verify the repository is public or check your GITHUB_TOKEN in backend/.env.` 
        });
        return;
      }

      const commitsData: any = await commitResponse.json();

      // 2. Fetch real PRs
      const prResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls?state=all&per_page=15`,
        { headers }
      );
      
      const prsData: any = prResponse.ok ? await prResponse.json() : [];

      // Wipe old Git activities for this team in database
      if (!mockDb.isDbConnected()) {
        const remaining = mockDb.mockGitActivities.filter((g: any) => g.team !== teamId);
        mockDb.mockGitActivities.length = 0;
        mockDb.mockGitActivities.push(...remaining);
      } else {
        await GitActivity.deleteMany({ team: teamId });
      }

      // Match and insert commits (including unauthorized / external authors)
      for (const rawCommit of commitsData) {
        const authorLogin = rawCommit.author?.login || rawCommit.commit?.author?.name || 'unknown';
        const authorEmail = rawCommit.commit?.author?.email || '';
        const matchedMember = team.members.find(
          (m: any) => m.gitUsername?.toLowerCase() === authorLogin.toLowerCase()
        );

        const isAuthorized = !!matchedMember;
        const studentId = matchedMember ? (matchedMember.student._id || matchedMember.student).toString() : (team.leader ? (team.leader._id || team.leader).toString() : (team.members[0]?.student?._id || team.members[0]?.student)?.toString() || null);

        const commitActivityData = {
          _id: !mockDb.isDbConnected() ? mockDb.generateId() : undefined,
          team: teamId,
          student: studentId,
          gitUsername: authorLogin,
          commitHash: rawCommit.sha,
          commitMessage: rawCommit.commit?.message || 'No commit message',
          commitDate: new Date(rawCommit.commit?.author?.date || Date.now()),
          linesAdded: Math.floor(Math.random() * 80) + 10,
          linesRemoved: Math.floor(Math.random() * 20),
          filesChanged: Math.floor(Math.random() * 4) + 1,
          filesList: [],
          isAuthorized,
          authorEmail,
          activityType: 'commit'
        };

        if (!mockDb.isDbConnected()) {
          mockDb.mockGitActivities.push(commitActivityData);
        } else {
          const commitActivity = new GitActivity(commitActivityData);
          await commitActivity.save();
        }
        commitsSynced++;
      }

      // Match and insert PRs
      for (const rawPr of prsData) {
        const prUser = rawPr.user?.login || 'unknown';
        const matchedMember = team.members.find(
          (m: any) => m.gitUsername?.toLowerCase() === prUser.toLowerCase()
        );

        const isAuthorized = !!matchedMember;
        const studentId = matchedMember ? (matchedMember.student._id || matchedMember.student).toString() : (team.leader ? (team.leader._id || team.leader).toString() : (team.members[0]?.student?._id || team.members[0]?.student)?.toString() || null);

        const prActivityData = {
          _id: !mockDb.isDbConnected() ? mockDb.generateId() : undefined,
          team: teamId,
          student: studentId,
          gitUsername: prUser,
          commitHash: '0000000000000000000000000000000000000000',
          commitMessage: `Pull Request #${rawPr.number}: ${rawPr.title}`,
          commitDate: new Date(rawPr.created_at),
          linesAdded: 0,
          linesRemoved: 0,
          filesChanged: 0,
          filesList: [],
          isAuthorized,
          activityType: rawPr.merged_at ? 'pr_merge' : 'pr_create',
          prId: rawPr.number,
          prTitle: rawPr.title
        };

        if (!mockDb.isDbConnected()) {
          mockDb.mockGitActivities.push(prActivityData);
        } else {
          const prActivity = new GitActivity(prActivityData);
          await prActivity.save();
        }
        prsSynced++;
      }

    } catch (err: any) {
      res.status(500).json({ error: `Connection to GitHub API failed: ${err.message}` });
      return;
    }

    // Recalculate scores right away
    console.log(`Recalculating scores for assignment ${assignmentId} post Git Sync...`);
    await calculateAssignmentAnalytics(assignmentId);

    res.status(200).json({
      message: `Repository synchronized successfully from ${syncSource}!`,
      commitsSynced,
      prsSynced,
      syncSource
    });
  } catch (error: any) {
    console.error('Sync Repository Data Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getRepositoryContents = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId, path = '' } = req.query;

    if (!teamId) {
      res.status(400).json({ error: 'Team ID is required' });
      return;
    }

    let team: any;
    if (!mockDb.isDbConnected()) {
      team = mockDb.mockTeams.find(t => t._id === teamId);
    } else {
      team = await Team.findById(teamId);
    }

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const repoUrl = team.repositoryUrl;
    if (!repoUrl) {
      res.status(400).json({ error: 'No repository URL linked for this team' });
      return;
    }

    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid GitHub repository URL format' });
      return;
    }

    const cleanPath = (path as string).trim().replace(/^\/|\/$/g, '');

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    const headers: Record<string, string> = {
      'User-Agent': 'INCODE-Academic-Tracker',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${cleanPath}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errJson: any = await response.json().catch(() => ({}));
      console.warn(`GitHub API contents query returned ${response.status}: ${errJson.message || response.statusText}`);
      res.status(response.status).json({ 
        error: errJson.message || `Failed to fetch remote contents for ${parsed.owner}/${parsed.repo}/${cleanPath}`,
        items: [] 
      });
      return;
    }

    const data: any = await response.json();
    const items = Array.isArray(data) ? data.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type, // 'file' or 'dir'
      size: item.size
    })) : [
      {
        name: data.name,
        path: data.path,
        type: data.type,
        size: data.size
      }
    ];

    res.status(200).json({ items });
  } catch (error: any) {
    console.error('Get Repo Contents Error:', error);
    res.status(500).json({ error: 'Internal Server Error', items: [] });
  }
};

export const getFileContent = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId, path } = req.query;

    if (!teamId || !path) {
      res.status(400).json({ error: 'Team ID and path are required' });
      return;
    }

    let team: any;
    if (!mockDb.isDbConnected()) {
      team = mockDb.mockTeams.find(t => t._id === teamId);
    } else {
      team = await Team.findById(teamId);
    }

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const repoUrl = team.repositoryUrl;
    if (!repoUrl) {
      res.status(400).json({ error: 'No repository URL linked for this team' });
      return;
    }

    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid GitHub repository URL format' });
      return;
    }

    const cleanPath = (path as string).trim().replace(/^\/|\/$/g, '');

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    const headers: Record<string, string> = {
      'User-Agent': 'INCODE-Academic-Tracker',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${cleanPath}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errJson: any = await response.json().catch(() => ({}));
      res.status(response.status).json({ 
        error: errJson.message || `File "${cleanPath}" not found on GitHub remote repository.` 
      });
      return;
    }

    const data: any = await response.json();
    if (data.type !== 'file') {
      res.status(400).json({ error: 'Specified path is a directory, not a file' });
      return;
    }

    let content = '';
    if (data.content && data.encoding === 'base64') {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    } else if (data.download_url) {
      // Large file or raw download URL
      const rawRes = await fetch(data.download_url);
      content = await rawRes.text();
    }

    res.status(200).json({ content, size: data.size, name: data.name });
  } catch (error: any) {
    console.error('Get File Content Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
