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

    let report = await AnalyticsReport.findOne({ assignment: assignmentId, student: studentId })
      .populate('student', 'name email')
      .populate('team', 'name');
    if (!report) {
      await calculateAssignmentAnalytics(assignmentId);
      report = await AnalyticsReport.findOne({ assignment: assignmentId, student: studentId })
        .populate('student', 'name email')
        .populate('team', 'name');
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

export const exportTelemetryCsv = async (req: any, res: Response): Promise<void> => {
  try {
    let sessions: any[] = [];
    if (!mockDb.isDbConnected()) {
      sessions = mockDb.mockVscodeSessions;
    } else {
      sessions = await VSCodeSession.find({})
        .populate('student', 'name email')
        .populate('assignment', 'title')
        .populate('team', 'name')
        .sort({ sessionStart: 1 });
    }

    const mode = (req.query.mode as string) || 'sliding';
    const windowMinutes = Math.max(1, parseInt(req.query.window as string, 10) || 5);
    const slideMinutes = Math.max(1, parseInt(req.query.slide as string, 10) || 1);

    const isSliding = mode !== 'session';
    const headers = isSliding
      ? [
          'window_id', 'session_id', 'student_id', 'student_name', 'student_email', 'team_name',
          'assignment_title', 'window_start_iso', 'window_end_iso', 'window_duration_minutes',
          'slide_stride_minutes', 'keystrokes', 'lines_added', 'lines_removed', 'net_lines',
          'paste_count', 'characters_pasted', 'manual_chars', 'paste_chars', 'ai_chars',
          'manual_percent', 'paste_percent', 'ai_percent', 'typing_speed_cpm',
          'keystroke_efficiency_keff', 'paste_ratio', 'is_offline', 'files_edited_count',
          'primary_file', 'coding_style', 'authenticity_label'
        ]
      : [
          'session_id', 'student_id', 'student_name', 'student_email', 'team_id', 'team_name',
          'assignment_id', 'assignment_title', 'session_start_iso', 'session_end_iso',
          'duration_minutes', 'keystrokes', 'lines_added', 'lines_removed', 'net_lines',
          'paste_count', 'characters_pasted', 'manual_chars', 'paste_chars', 'ai_chars',
          'manual_percent', 'paste_percent', 'ai_percent', 'typing_speed_cpm',
          'keystroke_efficiency_keff', 'paste_ratio', 'is_offline', 'files_edited_count',
          'files_edited_list', 'primary_file', 'coding_style', 'authenticity_label'
        ];

    const csvLines = [headers.join(',')];

    sessions.forEach(s => {
      const studentName = s.student?.name || 'Student';
      const studentEmail = s.student?.email || '';
      const studentId = s.student?._id || s.student || '';
      const teamName = s.team?.name || 'Team';
      const teamId = s.team?._id || s.team || '';
      const assignmentTitle = s.assignment?.title || 'Assignment';
      const assignmentId = s.assignment?._id || s.assignment || '';

      const durMin = Math.max(1, s.durationMinutes || 1);
      const keys = s.keystrokes || 0;
      const added = s.linesAdded || 0;
      const removed = s.linesRemoved || 0;
      const netLines = added - removed;
      const pasteCount = s.pasteCount || 0;
      const charsPasted = s.charactersPasted || 0;

      let manualChars = 0;
      let pasteChars = 0;
      let aiChars = 0;
      if (s.fileActivities && s.fileActivities.length > 0) {
        s.fileActivities.forEach((fa: any) => {
          manualChars += (fa.manualChars || 0);
          pasteChars += (fa.pasteChars || 0);
          aiChars += (fa.aiChars || 0);
        });
      } else {
        manualChars = keys;
        pasteChars = charsPasted;
      }

      const totalChars = manualChars + pasteChars + aiChars;
      const manualPct = totalChars > 0 ? Math.round((manualChars / totalChars) * 100) : (keys > 0 ? 100 : 0);
      const pastePct = totalChars > 0 ? Math.round((pasteChars / totalChars) * 100) : (charsPasted > 0 ? 100 : 0);
      const aiPct = totalChars > 0 ? Math.max(0, 100 - manualPct - pastePct) : 0;

      const cpm = (manualChars / durMin).toFixed(2);
      const keff = added > 0 ? (keys / added).toFixed(2) : (keys > 0 ? keys.toFixed(2) : '0.00');
      const pasteRatio = totalChars > 0 ? (pasteChars / totalChars).toFixed(4) : '0.0000';
      const filesList = (s.filesEdited || []).join(';').replace(/,/g, '|');
      const primaryFile = (s.filesEdited && s.filesEdited[0]) ? s.filesEdited[0] : 'none';

      let style = 'Manual Typing';
      if (pastePct > 45 || charsPasted > 300) style = 'Heavy Copy-Paste';
      else if (aiPct > 35 || aiChars > 400) style = 'AI-Assisted Development';
      else if (aiPct > 15) style = 'Balanced Copilot-Assisted';
      else if (manualPct >= 75) style = 'Authentic Manual Typing';

      const label = (aiPct > 50 || pastePct > 40 || (charsPasted > 200 && keys < 30)) ? 1 : 0;

      if (!isSliding) {
        // Output session row
        const row = [
          s._id,
          studentId,
          `"${studentName.replace(/"/g, '""')}"`,
          studentEmail,
          teamId,
          `"${teamName.replace(/"/g, '""')}"`,
          assignmentId,
          `"${assignmentTitle.replace(/"/g, '""')}"`,
          s.sessionStart ? new Date(s.sessionStart).toISOString() : '',
          s.sessionEnd ? new Date(s.sessionEnd).toISOString() : '',
          durMin,
          keys,
          added,
          removed,
          netLines,
          pasteCount,
          charsPasted,
          manualChars,
          pasteChars,
          aiChars,
          manualPct,
          pastePct,
          aiPct,
          cpm,
          keff,
          pasteRatio,
          s.isOffline ? 1 : 0,
          (s.filesEdited || []).length,
          `"${filesList}"`,
          `"${primaryFile}"`,
          `"${style}"`,
          label
        ];
        csvLines.push(row.join(','));
      } else {
        // Generate optimal 5-minute sliding windows with 1-minute stride (W=5 min, step=1 min)
        const sessStart = s.sessionStart ? new Date(s.sessionStart).getTime() : Date.now();
        const sessEnd = s.sessionEnd ? new Date(s.sessionEnd).getTime() : sessStart + durMin * 60000;
        const totalDurMin = Math.max(1, Math.round((sessEnd - sessStart) / 60000));

        const windowMs = windowMinutes * 60000;
        const slideMs = slideMinutes * 60000;

        let wStart = sessStart;
        let winIdx = 0;

        while (wStart <= sessEnd || winIdx === 0) {
          const wEnd = Math.min(sessEnd, wStart + windowMs);
          const actualWinMin = Math.max(1, Math.round((wEnd - wStart) / 60000));
          const fraction = Math.min(1.0, actualWinMin / totalDurMin);

          const wKeys = Math.round(keys * fraction);
          const wAdded = Math.round(added * fraction);
          const wRemoved = Math.round(removed * fraction);
          const wNet = wAdded - wRemoved;
          const wPasteCount = Math.round(pasteCount * fraction);
          const wCharsPasted = Math.round(charsPasted * fraction);
          const wManual = Math.round(manualChars * fraction);
          const wPaste = Math.round(pasteChars * fraction);
          const wAi = Math.round(aiChars * fraction);

          const wTotalChars = wManual + wPaste + wAi;
          const wManualPct = wTotalChars > 0 ? Math.round((wManual / wTotalChars) * 100) : manualPct;
          const wPastePct = wTotalChars > 0 ? Math.round((wPaste / wTotalChars) * 100) : pastePct;
          const wAiPct = wTotalChars > 0 ? Math.max(0, 100 - wManualPct - wPastePct) : aiPct;

          const wCpm = (wManual / actualWinMin).toFixed(2);
          const wKeff = wAdded > 0 ? (wKeys / wAdded).toFixed(2) : keff;
          const wPasteRatio = wTotalChars > 0 ? (wPaste / wTotalChars).toFixed(4) : pasteRatio;

          const winRow = [
            `"win_${s._id || 'sess'}_${winIdx}"`,
            s._id,
            studentId,
            `"${studentName.replace(/"/g, '""')}"`,
            studentEmail,
            `"${teamName.replace(/"/g, '""')}"`,
            `"${assignmentTitle.replace(/"/g, '""')}"`,
            new Date(wStart).toISOString(),
            new Date(wEnd).toISOString(),
            windowMinutes,
            slideMinutes,
            wKeys,
            wAdded,
            wRemoved,
            wNet,
            wPasteCount,
            wCharsPasted,
            wManual,
            wPaste,
            wAi,
            wManualPct,
            wPastePct,
            wAiPct,
            wCpm,
            wKeff,
            wPasteRatio,
            s.isOffline ? 1 : 0,
            (s.filesEdited || []).length,
            `"${primaryFile}"`,
            `"${style}"`,
            label
          ];
          csvLines.push(winRow.join(','));

          winIdx++;
          wStart += slideMs;
          if (wStart >= sessEnd) break;
        }
      }
    });

    const csvContent = csvLines.join('\n');
    const filename = isSliding
      ? `telemetry_dataset_w${windowMinutes}m_s${slideMinutes}m.csv`
      : 'telemetry_dataset_session.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Export CSV Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
