/**
 * Telemetry to CSV Exporter for AI/ML Model Training
 * Usage: node export_telemetry_csv.js
 */

const fs = require('fs');
const path = require('path');
const jwt = require('./backend/node_modules/jsonwebtoken');

const JWT_SECRET = 'hybrid_student_contribution_tracker_jwt_secret_key_2026_xyz';
const BACKEND_URL = 'http://127.0.0.1:5000';

// Generate admin/system token to access all endpoints
const token = jwt.sign({
  id: '6a45d813d96a3d2eff11b4ec',
  name: 'Dataset Exporter',
  email: 'research@collabintel.edu',
  role: 'admin'
}, JWT_SECRET, { expiresIn: '1d' });

async function run() {
  console.log('Fetching telemetry sessions from backend...');

  // 1. Get assignments
  const assignRes = await fetch(`${BACKEND_URL}/api/assignments`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const assignData = await assignRes.json();
  const assignments = assignData.assignments || [];

  console.log(`Found ${assignments.length} assignments in database.`);

  // 2. Fetch all team analytics for each assignment
  const allSessions = [];
  const allActivities = [];

  for (const a of assignments) {
    try {
      const reportsRes = await fetch(`${BACKEND_URL}/api/analytics/assignment/${a._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reportsData = await reportsRes.json();

      // If team exists for assignment
      const teamRes = await fetch(`${BACKEND_URL}/api/teams/assignment/${a._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => null);

      if (teamRes && teamRes.ok) {
        const tData = await teamRes.json();
        if (tData.team?._id) {
          const teamAnalyticsRes = await fetch(`${BACKEND_URL}/api/analytics/team/${tData.team._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const teamAnalytics = await teamAnalyticsRes.json();
          if (teamAnalytics.sessions) {
            teamAnalytics.sessions.forEach(s => {
              allSessions.push({
                ...s,
                assignmentId: a._id,
                assignmentTitle: a.title,
                teamId: tData.team._id,
                teamName: teamAnalytics.teamName || tData.team.name
              });
            });
          }
          if (teamAnalytics.activities) {
            allActivities.push(...teamAnalytics.activities);
          }
        }
      }
    } catch (err) {
      console.warn(`Could not process assignment ${a._id}:`, err.message);
    }
  }

  // Fallback: also directly fetch for current active team SE-365
  try {
    const directTeam = await fetch(`${BACKEND_URL}/api/analytics/team/6abd4a37ef9d08607aeeba84`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (directTeam.ok) {
      const t = await directTeam.json();
      (t.sessions || []).forEach(s => {
        if (!allSessions.some(existing => existing._id === s._id)) {
          allSessions.push({
            ...s,
            assignmentId: '6abd4983ef9d08607aeeba39',
            assignmentTitle: 'SSD Practical',
            teamId: '6abd4a37ef9d08607aeeba84',
            teamName: t.teamName || 'SE-365'
          });
        }
      });
    }
  } catch (_) { }

  console.log(`Aggregated ${allSessions.length} total telemetry sessions for export.`);

  if (allSessions.length === 0) {
    console.error('No sessions found to export.');
    process.exit(1);
  }

  // 3. Prepare ML CSV Features
  const headers = [
    'session_id',
    'student_id',
    'student_name',
    'git_username',
    'team_id',
    'team_name',
    'assignment_id',
    'assignment_title',
    'session_start_iso',
    'session_end_iso',
    'duration_minutes',
    'keystrokes',
    'lines_added',
    'lines_removed',
    'net_lines',
    'paste_count',
    'characters_pasted',
    'manual_chars',
    'paste_chars',
    'ai_chars',
    'manual_percent',
    'paste_percent',
    'ai_percent',
    'typing_speed_cpm',
    'keystroke_efficiency_keff',
    'paste_ratio',
    'is_offline',
    'files_edited_count',
    'files_edited_list',
    'primary_file',
    'coding_style',
    'authenticity_label'
  ];

  const csvLines = [headers.join(',')];

  allSessions.forEach(s => {
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
      s.fileActivities.forEach(fa => {
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

    // Label: 0 = Authentic Manual / Genuine Student Work, 1 = Synthetic / Bulk Copied / AI Injected
    const label = (aiPct > 50 || pastePct > 40 || (charsPasted > 200 && keys < 30)) ? 1 : 0;

    const row = [
      s._id,
      s.studentId || s.student || '',
      `"${(s.studentName || 'Student').replace(/"/g, '""')}"`,
      `"${(s.gitUsername || '').replace(/"/g, '""')}"`,
      s.teamId || '',
      `"${(s.teamName || 'Team').replace(/"/g, '""')}"`,
      s.assignmentId || '',
      `"${(s.assignmentTitle || 'Assignment').replace(/"/g, '""')}"`,
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
  });

  const outputPath = path.resolve(__dirname, 'telemetry_dataset.csv');
  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

  console.log('\n======================================================');
  console.log(' CSV DATASET EXPORT COMPLETED SUCCESSFULLY!');
  console.log(` File Saved At: ${outputPath}`);
  console.log(` Total Session Records: ${allSessions.length}`);
  console.log(` Total Features per Row: ${headers.length}`);
  console.log(` File Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('Export Error:', err);
  process.exit(1);
});
