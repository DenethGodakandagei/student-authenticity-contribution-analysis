import { Response } from 'express';
import mongoose from 'mongoose';
import { VSCodeSession, Team, GitActivity, User, Assignment } from '../models';
import { calculateAssignmentAnalytics } from '../lib/scoring';
import * as mockDb from '../models/mockStore';

export const syncVSCodeTelemetry = async (req: any, res: Response): Promise<void> => {
  try {
    const { sessions, assignmentId, ping } = req.body;
    const studentId = req.user.id;

    // Handle connection test ping from VS Code extension
    if (ping) {
      let user: any = null;
      if (!mockDb.isDbConnected()) {
        user = mockDb.mockUsers.find((u: any) => u._id === studentId);
      } else {
        if (mongoose.isValidObjectId(studentId)) {
          user = await User.findById(studentId).select('-password');
        } else if (req.user?.email) {
          user = await User.findOne({ email: req.user.email }).select('-password');
        }
      }

      if (!user) {
        user = {
          _id: studentId,
          name: req.user?.name || 'Student',
          email: req.user?.email || 'student@domain.edu'
        };
      }

      let assignment: any = null;
      let team: any = null;

      if (assignmentId) {
        if (!mockDb.isDbConnected()) {
          assignment = mockDb.mockAssignments.find((a: any) => a._id === assignmentId);
          team = mockDb.mockTeams.find((t: any) =>
            t.assignment === assignmentId && t.members.some((m: any) => m.student === studentId)
          );
        } else {
          if (mongoose.isValidObjectId(assignmentId)) {
            try {
              assignment = await Assignment.findById(assignmentId);
            } catch (_) {}
            try {
              team = await Team.findOne({
                assignment: assignmentId,
                'members.student': user._id || studentId
              });
            } catch (_) {}
          }
        }
      }

      const assignmentMsg = assignment
        ? ` Assignment: "${assignment.title.trim()}".`
        : (assignmentId ? ` (Assignment ID ${assignmentId} acknowledged).` : '');
      const teamMsg = team
        ? ` Active in team "${team.name}".`
        : ` (Note: not enrolled in a team for this assignment yet).`;

      res.status(200).json({
        ok: true,
        message: `Connected successfully! Authenticated as ${user.name} (${user.email}).${assignmentMsg}${teamMsg}`,
        student: { id: user._id, name: user.name, email: user.email },
        assignment: assignment ? { id: assignment._id, title: assignment.title } : null,
        team: team ? { id: team._id, name: team.name } : null
      });
      return;
    }

    if (!assignmentId) {
      res.status(400).json({ error: 'Assignment ID is required' });
      return;
    }

    if (!sessions) {
      res.status(400).json({ error: 'No sessions provided for synchronization' });
      return;
    }

    // Sessions can be a single session object or an array of cached offline sessions
    const sessionList = (Array.isArray(sessions) ? sessions : [sessions]).filter(Boolean);

    if (sessionList.length === 0) {
      res.status(400).json({ error: 'No sessions provided for synchronization' });
      return;
    }

    // Find student's team for this assignment to populate team references
    let teamId: string | null = null;
    let gitUsername = '';

    if (!mockDb.isDbConnected()) {
      const team = mockDb.mockTeams.find(t =>
        t.assignment === assignmentId && t.members.some((m: any) => m.student === studentId)
      );
      if (team) {
        teamId = team._id;
        const member = team.members.find((m: any) => m.student === studentId);
        gitUsername = member?.gitUsername || '';
      }
    } else {
      const team = await Team.findOne({ assignment: assignmentId, 'members.student': studentId });
      if (team) {
        teamId = team._id.toString();
        const member = (team as any).members.find((m: any) => m.student.toString() === studentId);
        gitUsername = member?.gitUsername || '';
      }
    }

    if (!teamId) {
      res.status(400).json({ error: 'You must join a team for this assignment before syncing telemetry' });
      return;
    }

    // Resolve gitUsername from User record as fallback
    if (!gitUsername) {
      if (!mockDb.isDbConnected()) {
        const u = mockDb.mockUsers.find((u: any) => u._id === studentId);
        gitUsername = u ? u.name.toLowerCase().replace(/\s+/g, '-') : `git-${studentId.slice(-4)}`;
      } else {
        const u = await User.findById(studentId);
        gitUsername = u ? u.name.toLowerCase().replace(/\s+/g, '-') : `git-${studentId.slice(-4)}`;
      }
    }

    const savedSessions: any[] = [];
    let localCommitsSaved = 0;

    // Helper to compute / normalize coding provenance & file activities
    const resolveProvenance = (s: any) => {
      const manualChars = s.manualChars || s.keystrokes || 0;
      const pasteChars = s.charactersPasted || 0;
      const aiChars = s.aiChars || 0;
      const total = manualChars + pasteChars + aiChars;

      let manualPercent = 100;
      let pastePercent = 0;
      let aiPercent = 0;

      if (total > 0) {
        manualPercent = Math.round((manualChars / total) * 100);
        pastePercent = Math.round((pasteChars / total) * 100);
        aiPercent = Math.max(0, 100 - manualPercent - pastePercent);
      }

      let style = 'Manual Typing';
      if (pastePercent > 50) style = 'Heavy Copy-Paste';
      else if (aiPercent > 40) style = 'AI-Assisted Development';
      else if (aiPercent > 15) style = 'Balanced Copilot-Assisted';
      else if (manualPercent >= 80) style = 'Authentic Manual Typing';

      const codingProvenance = s.codingProvenance || {
        manualPercent,
        pastePercent,
        aiPercent,
        style
      };

      let fileActivities = Array.isArray(s.fileActivities) && s.fileActivities.length > 0 ? s.fileActivities : [];
      if (fileActivities.length === 0) {
        const allFiles = Array.from(new Set([...(s.filesCreated || []), ...(s.filesEdited || []), ...(s.filesDeleted || [])]));
        const count = Math.max(1, allFiles.length);
        fileActivities = allFiles.map((fp: string) => {
          const isCreated = (s.filesCreated || []).includes(fp);
          const isDeleted = (s.filesDeleted || []).includes(fp);
          const action = isCreated ? 'created' : (isDeleted ? 'deleted' : 'edited');
          return {
            filePath: fp,
            action,
            manualChars: Math.round(manualChars / count),
            pasteChars: Math.round(pasteChars / count),
            aiChars: Math.round(aiChars / count),
            manualKeystrokes: Math.round(manualChars / count),
            pasteEvents: s.pasteCount || 0,
            aiEvents: s.aiEvents || 0,
            typingProvenance: pastePercent > 50 ? 'copy_paste' : (aiPercent > 20 ? 'ai_assisted' : 'manual'),
            linesAdded: Math.round((s.linesAdded || 0) / count),
            linesRemoved: Math.round((s.linesRemoved || 0) / count),
            lineRecords: [],
            timestamp: new Date()
          };
        });
      } else {
        // Preserve lineRecords from extension telemetry — they contain per-line provenance & isOffline state
        fileActivities = fileActivities.map((fa: any) => ({
          ...fa,
          lineRecords: Array.isArray(fa.lineRecords) ? fa.lineRecords : []
        }));
      }

      return { codingProvenance, fileActivities };
    };

    if (!mockDb.isDbConnected()) {
      // Mock Database Mode
      for (const s of sessionList) {
        const duration = Math.round(
          (new Date(s.sessionEnd).getTime() - new Date(s.sessionStart).getTime()) / 60000
        );
        // Helper to extract active parent directories
        const deriveFolders = (fileList: string[] = []) => {
          const folders = new Set<string>();
          fileList.forEach(fp => {
            const parts = fp.split('/');
            if (parts.length > 1) {
              parts.pop();
              folders.add(parts.join('/'));
            }
          });
          return Array.from(folders);
        };

        const { codingProvenance, fileActivities } = resolveProvenance(s);

        const newSession = {
          _id: mockDb.generateId(),
          student: studentId,
          assignment: assignmentId,
          team: teamId,
          sessionStart: new Date(s.sessionStart),
          sessionEnd: new Date(s.sessionEnd),
          durationMinutes: duration > 0 ? duration : (s.durationMinutes || 10),
          keystrokes: s.keystrokes || 0,
          filesEdited: s.filesEdited || [],
          filesCreated: s.filesCreated || [],
          filesDeleted: s.filesDeleted || [],
          foldersCreated: s.foldersCreated || [],
          foldersDeleted: s.foldersDeleted || [],
          activeFolders: s.activeFolders || deriveFolders(s.filesEdited),
          fileActivities,
          codingProvenance,
          linesAdded: s.linesAdded || 0,
          linesRemoved: s.linesRemoved || 0,
          isOffline: s.isOffline || false,
          pasteCount: s.pasteCount || 0,
          charactersPasted: s.charactersPasted || 0,
          manualChars: s.manualChars || 0,
          aiChars: s.aiChars || 0,
          aiEvents: s.aiEvents || 0,
          createdAt: new Date()
        };
        mockDb.mockVscodeSessions.push(newSession);
        savedSessions.push(newSession);

        // Store local commits bundled with this session
        if (Array.isArray(s.localCommits)) {
          for (const commit of s.localCommits) {
            const existingHash = mockDb.mockGitActivities.find((g: any) => g.commitHash === commit.hash);
            if (existingHash) continue; // deduplicate

            const newActivity = {
              _id: mockDb.generateId(),
              team: teamId,
              student: studentId,
              gitUsername,
              commitHash: commit.hash,
              commitMessage: commit.message || 'No message',
              commitDate: new Date(commit.date),
              linesAdded: commit.insertions || 0,
              linesRemoved: commit.deletions || 0,
              filesChanged: commit.filesChanged || 0,
              activityType: 'commit'
            };
            mockDb.mockGitActivities.push(newActivity);
            localCommitsSaved++;
          }
        }
      }
      mockDb.saveToDisk();
    } else {
      // MongoDB Mode
      for (const s of sessionList) {
        const duration = Math.round(
          (new Date(s.sessionEnd).getTime() - new Date(s.sessionStart).getTime()) / 60000
        );

        const deriveFolders = (fileList: string[] = []) => {
          const folders = new Set<string>();
          fileList.forEach(fp => {
            const parts = fp.split('/');
            if (parts.length > 1) {
              parts.pop();
              folders.add(parts.join('/'));
            }
          });
          return Array.from(folders);
        };

        const { codingProvenance, fileActivities } = resolveProvenance(s);

        const newSession = new VSCodeSession({
          student: studentId,
          assignment: assignmentId,
          team: teamId,
          sessionStart: new Date(s.sessionStart),
          sessionEnd: new Date(s.sessionEnd),
          durationMinutes: duration > 0 ? duration : (s.durationMinutes || 10),
          keystrokes: s.keystrokes || 0,
          filesEdited: s.filesEdited || [],
          filesCreated: s.filesCreated || [],
          filesDeleted: s.filesDeleted || [],
          foldersCreated: s.foldersCreated || [],
          foldersDeleted: s.foldersDeleted || [],
          activeFolders: s.activeFolders || deriveFolders(s.filesEdited),
          fileActivities,
          codingProvenance,
          linesAdded: s.linesAdded || 0,
          linesRemoved: s.linesRemoved || 0,
          isOffline: s.isOffline || false,
          pasteCount: s.pasteCount || 0,
          charactersPasted: s.charactersPasted || 0,
          manualChars: s.manualChars || 0,
          aiChars: s.aiChars || 0,
          aiEvents: s.aiEvents || 0
        });
        await newSession.save();
        savedSessions.push(newSession);

        // Store local commits bundled with this session
        if (Array.isArray(s.localCommits)) {
          for (const commit of s.localCommits) {
            const existing = await GitActivity.findOne({ commitHash: commit.hash, team: teamId });
            if (existing) continue; // deduplicate

            const activity = new GitActivity({
              team: teamId,
              student: studentId,
              gitUsername,
              commitHash: commit.hash,
              commitMessage: commit.message || 'No message',
              commitDate: new Date(commit.date),
              linesAdded: commit.insertions || 0,
              linesRemoved: commit.deletions || 0,
              filesChanged: commit.filesChanged || (s.filesEdited || []).length || 0,
              filesList: commit.filesList || commit.filesEdited || s.filesEdited || [],
              activityType: 'commit'
            });
            await activity.save();
            localCommitsSaved++;
          }
        }
      }
    }

    // Recalculate scores right away
    console.log(`Recalculating analytics scores for assignment ${assignmentId} after telemetry sync...`);
    await calculateAssignmentAnalytics(assignmentId);

    res.status(200).json({
      message: `Successfully synchronized ${savedSessions.length} VS Code development sessions!`,
      syncedCount: savedSessions.length,
      localCommitsSaved
    });
  } catch (error: any) {
    console.error('Sync VSCode Telemetry Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


