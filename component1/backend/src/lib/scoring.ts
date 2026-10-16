import mongoose from 'mongoose';
import { User, Assignment, Team, Task, VSCodeSession, GitActivity, AnalyticsReport } from '../models';
import * as mockDb from '../models/mockStore';

// Target benchmarks for normalization
const BENCHMARK_COMMITS = 4;
const BENCHMARK_PRS = 1;
const BENCHMARK_MINUTES = 180; // 3 hours of active coding
const BENCHMARK_KEYSTROKES = 3000;
const BENCHMARK_LINES_CHANGED = 300;

interface StudentStats {
  commits: number;
  prs: number;
  minutes: number;
  offlineMinutes: number;
  keystrokes: number;
  linesAdded: number;
  linesRemoved: number;
  filesEdited: number;
  tasksAssigned: number;
  tasksCompleted: number;
  pasteCount: number;
  charactersPasted: number;
}

/**
 * Computes analytics reports for a given assignment, updating records in Mongo or MockDb
 */
export async function calculateAssignmentAnalytics(assignmentId: string): Promise<any[]> {
  const isMock = !mockDb.isDbConnected();
  let assignment: any;
  let teams: any[] = [];
  let students: any[] = [];

  if (isMock) {
    assignment = mockDb.mockAssignments.find(a => a._id === assignmentId);
    if (!assignment) return [];
    teams = mockDb.mockTeams.filter(t => t.assignment === assignmentId);
    students = mockDb.mockUsers.filter(u => u.role === 'student');
  } else {
    assignment = await Assignment.findById(assignmentId);
    if (!assignment) return [];
    teams = await Team.find({ assignment: assignmentId });
    students = await User.find({ role: 'student' });
  }

  const reports: any[] = [];

  for (const team of teams) {
    const teamMembers = team.members;
    const teamStudentIds = teamMembers.map((m: any) => m.student.toString());
    const memberStats: Record<string, StudentStats> = {};

    // Initialize stats
    for (const studentId of teamStudentIds) {
      memberStats[studentId] = {
        commits: 0,
        prs: 0,
        minutes: 0,
        offlineMinutes: 0,
        keystrokes: 0,
        linesAdded: 0,
        linesRemoved: 0,
        filesEdited: 0,
        tasksAssigned: 0,
        tasksCompleted: 0,
        pasteCount: 0,
        charactersPasted: 0
      };
    }

    // 1. Gather Git Activities
    let gitActivities: any[] = [];
    if (isMock) {
      gitActivities = mockDb.mockGitActivities.filter(g => g.team === team._id.toString());
    } else {
      gitActivities = await GitActivity.find({ team: team._id });
    }

    for (const activity of gitActivities) {
      const studentId = activity.student.toString();
      if (memberStats[studentId]) {
        if (activity.activityType === 'commit') {
          memberStats[studentId].commits++;
        } else if (activity.activityType === 'pr_create' || activity.activityType === 'pr_merge') {
          memberStats[studentId].prs++;
        }
      }
    }

    // 2. Gather VS Code Sessions
    let sessions: any[] = [];
    if (isMock) {
      sessions = mockDb.mockVscodeSessions.filter(s => s.team === team._id.toString());
    } else {
      sessions = await VSCodeSession.find({ team: team._id });
    }

    for (const s of sessions) {
      const studentId = s.student.toString();
      if (memberStats[studentId]) {
        memberStats[studentId].minutes += s.durationMinutes;
        if (s.isOffline) {
          memberStats[studentId].offlineMinutes += s.durationMinutes;
        }
        memberStats[studentId].keystrokes += s.keystrokes || 0;
        memberStats[studentId].linesAdded += s.linesAdded || 0;
        memberStats[studentId].linesRemoved += s.linesRemoved || 0;
        memberStats[studentId].pasteCount += s.pasteCount || 0;
        memberStats[studentId].charactersPasted += s.charactersPasted || 0;
        
        // Count unique files
        const edited = s.filesEdited || [];
        const created = s.filesCreated || [];
        const deleted = s.filesDeleted || [];
        const uniqueFiles = new Set([...edited, ...created, ...deleted]);
        memberStats[studentId].filesEdited += uniqueFiles.size;
      }
    }

    // 3. Gather Kanban Tasks
    let tasks: any[] = [];
    if (isMock) {
      tasks = mockDb.mockTasks.filter(t => t.team === team._id.toString());
    } else {
      tasks = await Task.find({ team: team._id });
    }

    for (const task of tasks) {
      const studentId = task.assignedTo.toString();
      if (memberStats[studentId]) {
        memberStats[studentId].tasksAssigned++;
        if (task.status === 'done') {
          memberStats[studentId].tasksCompleted++;
        }
      }
    }

    // Calculate team average effort for collaboration & free-rider detection
    const effortScores: Record<string, number> = {};
    let totalTeamEffort = 0;

    for (const studentId of teamStudentIds) {
      const stats = memberStats[studentId];
      // Effort is a combination of commits, active minutes, and task completions
      const effort = (stats.commits * 10) + (stats.minutes * 0.2) + (stats.tasksCompleted * 15);
      effortScores[studentId] = effort;
      totalTeamEffort += effort;
    }

    // Gather and aggregate file activities and provenance across student sessions
    const studentFileMap: Record<string, Map<string, any>> = {};
    const studentProvenanceAgg: Record<string, { manualChars: number; pasteChars: number; aiChars: number }> = {};

    for (const studentId of teamStudentIds) {
      studentFileMap[studentId] = new Map();
      studentProvenanceAgg[studentId] = { manualChars: 0, pasteChars: 0, aiChars: 0 };
    }

    for (const s of sessions) {
      const studentId = s.student.toString();
      if (!studentProvenanceAgg[studentId]) continue;

      if (Array.isArray(s.fileActivities)) {
        for (const fa of s.fileActivities) {
          studentProvenanceAgg[studentId].manualChars += (fa.manualChars || 0);
          studentProvenanceAgg[studentId].pasteChars += (fa.pasteChars || 0);
          studentProvenanceAgg[studentId].aiChars += (fa.aiChars || 0);

          const existing = studentFileMap[studentId].get(fa.filePath) || {
            filePath: fa.filePath,
            action: fa.action || 'edited',
            manualChars: 0,
            pasteChars: 0,
            aiChars: 0,
            manualKeystrokes: 0,
            pasteEvents: 0,
            aiEvents: 0,
            typingProvenance: fa.typingProvenance || 'manual',
            linesAdded: 0,
            linesRemoved: 0,
            timestamp: fa.timestamp || new Date()
          };

          existing.manualChars += (fa.manualChars || 0);
          existing.pasteChars += (fa.pasteChars || 0);
          existing.aiChars += (fa.aiChars || 0);
          existing.manualKeystrokes += (fa.manualKeystrokes || 0);
          existing.pasteEvents += (fa.pasteEvents || 0);
          existing.aiEvents += (fa.aiEvents || 0);
          existing.linesAdded += (fa.linesAdded || 0);
          existing.linesRemoved += (fa.linesRemoved || 0);

          const fileTotal = existing.manualChars + existing.pasteChars + existing.aiChars;
          if (fileTotal > 0) {
            if (existing.pasteChars / fileTotal > 0.5) existing.typingProvenance = 'copy_paste';
            else if (existing.aiChars / fileTotal > 0.3) existing.typingProvenance = 'ai_assisted';
            else if (existing.manualChars / fileTotal >= 0.75) existing.typingProvenance = 'manual';
            else existing.typingProvenance = 'mixed';
          }

          studentFileMap[studentId].set(fa.filePath, existing);
        }
      } else {
        studentProvenanceAgg[studentId].manualChars += (s.keystrokes || 0);
        studentProvenanceAgg[studentId].pasteChars += (s.charactersPasted || 0);
      }
    }

    const teamSize = teamStudentIds.length;
    const averageEffort = teamSize > 0 ? totalTeamEffort / teamSize : 0;

    // Calculate individual scores
    for (const studentId of teamStudentIds) {
      const stats = memberStats[studentId];

      // A. GitHub Score (max 100)
      const commitScore = Math.min((stats.commits / BENCHMARK_COMMITS) * 70, 70);
      const prScore = Math.min((stats.prs / BENCHMARK_PRS) * 30, 30);
      const gitScore = Math.round(commitScore + prScore);

      // B. VS Code Score (max 100)
      const durationScore = Math.min((stats.minutes / BENCHMARK_MINUTES) * 50, 50);
      const keystrokeScore = Math.min((stats.keystrokes / BENCHMARK_KEYSTROKES) * 25, 25);
      const linesScore = Math.min(((stats.linesAdded + stats.linesRemoved) / BENCHMARK_LINES_CHANGED) * 25, 25);
      const vscodeScore = Math.round(durationScore + keystrokeScore + linesScore);

      // C. Task Completion Score (max 100)
      let taskScore = 100;
      if (stats.tasksAssigned > 0) {
        taskScore = Math.round((stats.tasksCompleted / stats.tasksAssigned) * 100);
      } else {
        const totalTeamTasks = tasks.length;
        taskScore = totalTeamTasks > 0 ? 50 : 100;
      }

      // D. Collaboration Score (max 100)
      let collabScore = 100;
      if (totalTeamEffort > 0) {
        const studentShare = effortScores[studentId] / totalTeamEffort;
        const fairShare = 1 / teamSize;
        const deviation = Math.abs(studentShare - fairShare);
        collabScore = Math.max(0, Math.round(100 - (deviation * 150)));
      }

      // E. Weighted Final Score
      const w = assignment.weights;
      const finalScore = Math.round(
        (gitScore * (w.git / 100)) +
        (vscodeScore * (w.vscode / 100)) +
        (taskScore * (w.task / 100)) +
        (collabScore * (w.collab / 100))
      );

      // F. Provenance Breakdown & Anomaly Detection
      const prov = studentProvenanceAgg[studentId] || { manualChars: stats.keystrokes, pasteChars: stats.charactersPasted, aiChars: 0 };
      const totalChars = prov.manualChars + prov.pasteChars + prov.aiChars;

      let manualPercent = 100;
      let pastePercent = 0;
      let aiPercent = 0;

      if (totalChars > 0) {
        manualPercent = Math.round((prov.manualChars / totalChars) * 100);
        pastePercent = Math.round((prov.pasteChars / totalChars) * 100);
        aiPercent = Math.max(0, 100 - manualPercent - pastePercent);
      }

      let primaryCodingStyle = 'Manual Typing';
      if (pastePercent > 50) primaryCodingStyle = 'Heavy Copy-Paste';
      else if (aiPercent > 40) primaryCodingStyle = 'AI-Assisted Development';
      else if (aiPercent > 15) primaryCodingStyle = 'Balanced Copilot-Assisted';
      else if (manualPercent >= 80) primaryCodingStyle = 'Authentic Manual Typing';

      // F. Alerts: Free Rider, Inactivity, and Copy-Paste Anomalies
      let isFreeRider = false;
      let isInactive = false;
      let hasCopyPasteAnomaly = false;
      let hasAiAnomaly = false;
      let alertMessage = '';

      if (averageEffort > 15 && effortScores[studentId] < (averageEffort * 0.35)) {
        isFreeRider = true;
        alertMessage = 'Warning: Contribution is significantly below the team average (Free-rider risk). ';
      }

      if (stats.minutes < 20) {
        isInactive = true;
        alertMessage += 'Alert: Extremely low development activity logged in VS Code. ';
      }

      const keystrokeRatio = stats.linesAdded > 0 ? parseFloat((stats.keystrokes / stats.linesAdded).toFixed(2)) : 100;
      if (pastePercent > 50 || (stats.linesAdded >= 50 && keystrokeRatio < 2.0)) {
        hasCopyPasteAnomaly = true;
        alertMessage += `Warning: Bulk copy-paste anomaly detected (${pastePercent}% pasted content). `;
      }

      if (aiPercent > 60) {
        hasAiAnomaly = true;
        alertMessage += `Notice: Heavy reliance on AI code generation (${aiPercent}% AI generated). `;
      }

      const consolidatedFiles = Array.from((studentFileMap[studentId] || new Map()).values());

      const reportData = {
        assignment: assignmentId,
        student: studentId,
        team: team._id.toString(),
        scores: {
          git: gitScore,
          vscode: vscodeScore,
          task: taskScore,
          collab: collabScore,
          final: finalScore
        },
        metrics: {
          totalCommits: stats.commits,
          totalPRs: stats.prs,
          codingHours: parseFloat((stats.minutes / 60).toFixed(2)),
          offlineHours: parseFloat((stats.offlineMinutes / 60).toFixed(2)),
          filesModified: stats.filesEdited || consolidatedFiles.length,
          linesAdded: stats.linesAdded,
          linesRemoved: stats.linesRemoved,
          tasksCompleted: stats.tasksCompleted,
          keystrokeRatio,
          pasteCount: stats.pasteCount,
          charactersPasted: stats.charactersPasted,
          manualPercent,
          pastePercent,
          aiPercent,
          primaryCodingStyle,
          fileActivities: consolidatedFiles
        },
        alerts: {
          isFreeRider,
          isInactive,
          hasCopyPasteAnomaly,
          hasAiAnomaly,
          alertMessage: alertMessage.trim() || 'Active and authentic contributor.'
        },
        updatedAt: new Date()
      };

      reports.push(reportData);

      // Save/Update report
      if (isMock) {
        const idx = mockDb.mockAnalyticsReports.findIndex(
          r => r.assignment === assignmentId && r.student === studentId
        );
        if (idx !== -1) {
          mockDb.mockAnalyticsReports[idx] = { ...mockDb.mockAnalyticsReports[idx], ...reportData };
        } else {
          mockDb.mockAnalyticsReports.push({ _id: mockDb.generateId(), ...reportData });
        }
      } else {
        await AnalyticsReport.findOneAndUpdate(
          { assignment: assignmentId, student: studentId },
          reportData,
          { upsert: true, new: true }
        );
      }
    }
  }

  return reports;
}
