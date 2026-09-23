import { calculateAssignmentAnalytics } from './lib/scoring';
import { seedMockDatabase, mockAnalyticsReports, mockUsers } from './models/mockStore';

async function runTest() {
  console.log('--- STARTING SCORING ENGINE INTEGRATION TEST ---');
  
  // 1. Seed the in-memory database
  seedMockDatabase();
  
  // 2. Trigger analytics evaluation for the group project
  const assignmentId = '6677b2b22f95305cc857f101';
  console.log(`Calculating scores for assignment: ${assignmentId}`);
  const reports = await calculateAssignmentAnalytics(assignmentId);
  
  console.log(`Evaluated ${reports.length} students.`);
  
  // 3. Verify results
  let passed = true;

  // Find Alex (highly active developer)
  const alexReport = reports.find(r => r.student === '6677a1a11f95305cc857f002');
  if (alexReport) {
    console.log(`\n[STUDENT: Alex Rivera]`);
    console.log(`  Git Score: ${alexReport.scores.git}/100 (Commits: ${alexReport.metrics.totalCommits})`);
    console.log(`  VS Code Score: ${alexReport.scores.vscode}/100 (Hours: ${alexReport.metrics.codingHours})`);
    console.log(`  Task Score: ${alexReport.scores.task}/100`);
    console.log(`  Collab Score: ${alexReport.scores.collab}/100`);
    console.log(`  -> Final Balanced Score: ${alexReport.scores.final}/100`);
    console.log(`  Alerts: Free Rider = ${alexReport.alerts.isFreeRider}, Message = "${alexReport.alerts.alertMessage}"`);
    
    if (alexReport.scores.final < 70) {
      console.error('FAIL: Alex should have a high score (>= 70).');
      passed = false;
    }
  } else {
    console.error('FAIL: Could not locate Alex Rivera report.');
    passed = false;
  }

  // Find Emma (free-rider & copy-paster)
  const emmaReport = reports.find(r => r.student === '6677a1a11f95305cc857f005');
  if (emmaReport) {
    console.log(`\n[STUDENT: Emma Watson]`);
    console.log(`  Git Score: ${emmaReport.scores.git}/100 (Commits: ${emmaReport.metrics.totalCommits})`);
    console.log(`  VS Code Score: ${emmaReport.scores.vscode}/100 (Hours: ${emmaReport.metrics.codingHours})`);
    console.log(`  Task Score: ${emmaReport.scores.task}/100 (Tasks Completed: ${emmaReport.metrics.tasksCompleted})`);
    console.log(`  Collab Score: ${emmaReport.scores.collab}/100`);
    console.log(`  -> Final Balanced Score: ${emmaReport.scores.final}/100`);
    console.log(`  Alerts: Free Rider = ${emmaReport.alerts.isFreeRider}, Copy-Paste Anomaly = ${emmaReport.alerts.hasCopyPasteAnomaly}`);
    console.log(`  Metrics: Keystroke Ratio = ${emmaReport.metrics.keystrokeRatio}, Pastes = ${emmaReport.metrics.pasteCount}, Characters Pasted = ${emmaReport.metrics.charactersPasted}`);
    console.log(`  Alert Message = "${emmaReport.alerts.alertMessage}"`);

    if (!emmaReport.alerts.isFreeRider) {
      console.error('FAIL: Emma Watson should be flagged as a Free Rider (isFreeRider = true).');
      passed = false;
    }
    if (!emmaReport.alerts.hasCopyPasteAnomaly) {
      console.error('FAIL: Emma Watson should be flagged with Copy-Paste Anomaly (hasCopyPasteAnomaly = true).');
      passed = false;
    }
    if (emmaReport.metrics.keystrokeRatio !== 0.05) {
      console.error(`FAIL: Emma Watson keystroke ratio should be 0.05 (got ${emmaReport.metrics.keystrokeRatio}).`);
      passed = false;
    }
    if (emmaReport.metrics.pasteCount !== 2) {
      console.error(`FAIL: Emma Watson pasteCount should be 2 (got ${emmaReport.metrics.pasteCount}).`);
      passed = false;
    }
    if (emmaReport.scores.final > 35) {
      console.error('FAIL: Emma Watson should have a low final score (<= 35) due to inactivity.');
      passed = false;
    }
  } else {
    console.error('FAIL: Could not locate Emma Watson report.');
    passed = false;
  }

  console.log('\n----------------------------------------------');
  if (passed) {
    console.log('SUCCESS: All scoring and free-rider detection tests PASSED!');
  } else {
    console.error('FAILURE: Scoring integration tests failed validations.');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Test execution threw error:', err);
  process.exit(1);
});
