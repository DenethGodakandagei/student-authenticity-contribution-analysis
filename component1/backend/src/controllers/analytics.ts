import { Response } from 'express';
import { AnalyticsReport, Team, Assignment, User, GitActivity, VSCodeSession } from '../models';
import { calculateAssignmentAnalytics } from '../lib/scoring';
import * as mockDb from '../models/mockStore';

export const getAssignmentReports = async (req: any, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;

    if (!mockDb.isDbConnected()) {
      // Fetch mock reports
      let reports = mockDb.mockAnalyticsReports.filter(r => r.assignment === assignmentId);
      
      // If no reports computed, trigger computation first
      if (reports.length === 0) {
        reports = await calculateAssignmentAnalytics(assignmentId);
      }

      // Populate student name and team name
      const populated = reports.map(r => {
        const studentObj = mockDb.mockUsers.find(u => u._id === r.student);
        const teamObj = mockDb.mockTeams.find(t => t._id === r.team);
        return {
          ...r,
          student: { _id: studentObj?._id, name: studentObj?.name, email: studentObj?.email },
          team: { _id: teamObj?._id, name: teamObj?.name }
        };
      });

      res.status(200).json({ reports: populated });
      return;
    }

    // DB mode
    let reports = await AnalyticsReport.find({ assignment: assignmentId })
      .populate('student', 'name email')
      .populate('team', 'name');

    if (reports.length === 0) {
      await calculateAssignmentAnalytics(assignmentId);
      reports = await AnalyticsReport.find({ assignment: assignmentId })
        .populate('student', 'name email')
        .populate('team', 'name');
    }

    res.status(200).json({ reports });
  } catch (error: any) {
    console.error('Get Assignment Reports Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getStudentReport = async (req: any, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;

    if (!mockDb.isDbConnected()) {
      let report = mockDb.mockAnalyticsReports.find(
        r => r.assignment === assignmentId && r.student === studentId
      );

      if (!report) {
        await calculateAssignmentAnalytics(assignmentId);
        report = mockDb.mockAnalyticsReports.find(
          r => r.assignment === assignmentId && r.student === studentId
        );
      }

      res.status(200).json({ report });
      return;
    }

    let report = await AnalyticsReport.findOne({ assignment: assignmentId, student: studentId });
    if (!report) {
      await calculateAssignmentAnalytics(assignmentId);
      report = await AnalyticsReport.findOne({ assignment: assignmentId, student: studentId });
    }

    res.status(200).json({ report });
  } catch (error: any) {
    console.error('Get Student Report Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTeamAnalytics = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    let team: any;
    let members: any[] = [];
    let gitActivities: any[] = [];
    let sessions: any[] = [];
    let reports: any[] = [];

    if (!mockDb.isDbConnected()) {
      team = mockDb.mockTeams.find(t => t._id === teamId);
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }
      members = team.members.map((m: any) => {
        const u = mockDb.mockUsers.find(user => user._id === m.student);
        return { studentId: m.student, name: u?.name, gitUsername: m.gitUsername };
      });
      gitActivities = mockDb.mockGitActivities.filter(g => g.team === teamId);
      sessions = mockDb.mockVscodeSessions.filter(s => s.team === teamId);
      reports = mockDb.mockAnalyticsReports.filter(r => r.team === teamId);
    } else {
      team = await Team.findById(teamId);
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      // Load members manually to construct clean response
      for (const m of team.members) {
        const u = await User.findById(m.student);
        members.push({ studentId: m.student.toString(), name: u?.name || 'Unknown', gitUsername: m.gitUsername });
      }

      gitActivities = await GitActivity.find({ team: teamId });
      sessions = await VSCodeSession.find({ team: teamId });
      reports = await AnalyticsReport.find({ team: teamId });
    }

    // 1. Team Contribution Balance
    // Sum commits, code hours, and calculate contribution shares
    const studentBreakdown = members.map(m => {
      const studentId = m.studentId;
      const studentGit = gitActivities.filter(g => g.student.toString() === studentId);
      const studentSessions = sessions.filter(s => s.student.toString() === studentId);
      
      const commits = studentGit.filter(g => g.activityType === 'commit').length;
      const prs = studentGit.filter(g => g.activityType === 'pr_merge' || g.activityType === 'pr_create').length;
      const hours = parseFloat(
        (studentSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60).toFixed(2)
      );
      const offlineHours = parseFloat(
        (studentSessions.filter(s => s.isOffline).reduce((acc, s) => acc + s.durationMinutes, 0) / 60).toFixed(2)
      );

      const linesAdded = studentSessions.reduce((acc, s) => acc + s.linesAdded, 0);
      const linesRemoved = studentSessions.reduce((acc, s) => acc + s.linesRemoved, 0);

      // Find final score if computed
      const score = reports.find(r => r.student.toString() === studentId)?.scores?.final || 0;

      return {
        studentId,
        name: m.name,
        gitUsername: m.gitUsername,
        commits,
        prs,
        hours,
        offlineHours,
        linesAdded,
        linesRemoved,
        score
      };
    });

    // 2. Activity Timeline (last 7 days activity aggregator)
    const timeline: Record<string, { commits: number; sessions: number }> = {};
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', dateOptions);
      timeline[label] = { commits: 0, sessions: 0 };
    }

    // Fill timeline commits
    gitActivities.forEach(g => {
      const dateLabel = new Date(g.commitDate).toLocaleDateString('en-US', dateOptions);
      if (timeline[dateLabel]) {
        timeline[dateLabel].commits++;
      }
    });

    // Fill timeline sessions
    sessions.forEach(s => {
      const dateLabel = new Date(s.sessionStart).toLocaleDateString('en-US', dateOptions);
      if (timeline[dateLabel]) {
        timeline[dateLabel].sessions++;
      }
    });

    const timelineData = Object.keys(timeline).map(key => ({
      date: key,
      commits: timeline[key].commits,
      sessions: timeline[key].sessions
    }));

    // 3. Team Collaboration/Balance Index
    // Standard deviation of scores. Higher variance = lower balance index.
    const scores = studentBreakdown.map(s => s.score);
    let balanceIndex = 100;
    if (scores.length > 1) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);
      // Standard deviation of 0 = 100% balance. Dev of 40 = 20% balance.
      balanceIndex = Math.max(0, Math.round(100 - stdDev * 2));
    }

    const mappedActivities = gitActivities.map(g => {
      const studentId = g.student ? g.student.toString() : '';
      const member = members.find(m => m.studentId === studentId);
      const isAuthorized = g.isAuthorized !== false && (!!member || !g.student);
      return {
        _id: g._id,
        studentId,
        studentName: member?.name || (isAuthorized ? 'Authorized Contributor' : `Unauthorized Contributor (${g.gitUsername})`),
        gitUsername: g.gitUsername,
        commitHash: g.commitHash,
        commitMessage: g.commitMessage,
        commitDate: g.commitDate,
        linesAdded: g.linesAdded,
        linesRemoved: g.linesRemoved,
        filesChanged: g.filesChanged,
        filesList: g.filesList || [],
        isAuthorized,
        authorEmail: g.authorEmail || '',
        activityType: g.activityType
      };
    });

    const mappedSessions = sessions.map(s => {
      const studentId = s.student ? s.student.toString() : '';
      const member = members.find(m => m.studentId === studentId);
      return {
        _id: s._id,
        studentId,
        studentName: member?.name || 'Unknown Student',
        gitUsername: member?.gitUsername || '',
        sessionStart: s.sessionStart,
        sessionEnd: s.sessionEnd,
        durationMinutes: s.durationMinutes,
        keystrokes: s.keystrokes || 0,
        filesEdited: s.filesEdited || [],
        filesCreated: s.filesCreated || [],
        filesDeleted: s.filesDeleted || [],
        foldersCreated: s.foldersCreated || [],
        foldersDeleted: s.foldersDeleted || [],
        activeFolders: s.activeFolders || [],
        linesAdded: s.linesAdded || 0,
        linesRemoved: s.linesRemoved || 0,
        isOffline: s.isOffline || false,
        pasteCount: s.pasteCount || 0,
        charactersPasted: s.charactersPasted || 0,
        // Include full fileActivities so the frontend blame inspector can use per-line lineRecords
        fileActivities: (s.fileActivities || []).map((fa: any) => ({
          filePath: fa.filePath,
          action: fa.action,
          manualChars: fa.manualChars || 0,
          pasteChars: fa.pasteChars || 0,
          aiChars: fa.aiChars || 0,
          manualKeystrokes: fa.manualKeystrokes || 0,
          pasteEvents: fa.pasteEvents || 0,
          aiEvents: fa.aiEvents || 0,
          typingProvenance: fa.typingProvenance || 'manual',
          linesAdded: fa.linesAdded || 0,
          linesRemoved: fa.linesRemoved || 0,
          lineRecords: fa.lineRecords || [],    // per-line provenance from extension telemetry
          timestamp: fa.timestamp || null
        }))
      };
    });

    res.status(200).json({
      teamName: team.name,
      repositoryUrl: team.repositoryUrl,
      membersCount: members.length,
      balanceIndex,
      studentBreakdown,
      timeline: timelineData,
      activities: mappedActivities,
      sessions: mappedSessions
    });
  } catch (error: any) {
    console.error('Get Team Analytics Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const triggerManualEvaluation = async (req: any, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      res.status(400).json({ error: 'Assignment ID is required' });
      return;
    }

    const reports = await calculateAssignmentAnalytics(assignmentId);
    res.status(200).json({ message: 'Analytics scores calculated successfully!', count: reports.length });
  } catch (error: any) {
    console.error('Trigger Evaluation Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
