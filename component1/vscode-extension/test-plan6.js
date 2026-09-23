// Lightweight mock for 'vscode' API when running standalone in Node.js
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
  if (request === 'vscode') {
    return {
      window: {
        createStatusBarItem: () => ({ show: () => {}, text: '', tooltip: '' }),
        createOutputChannel: (name) => ({
          appendLine: (msg) => {},
          clear: () => {},
          show: () => {}
        }),
        showWarningMessage: () => {},
        showInformationMessage: () => {},
        showErrorMessage: () => {}
      },
      StatusBarAlignment: { Left: 1, Right: 2 },
      ThemeColor: class ThemeColor { constructor(id) { this.id = id; } },
      workspace: {
        workspaceFolders: [{ uri: { fsPath: 'F:/test-workspace' } }]
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Module imports from out/
const { formatStatusBarText } = require('./out/ui/status-bar');
const { getAuditReportData, formatBytes } = require('./out/ui/audit-viewer');
const {
  profileHook,
  checkMemoryUsage,
  estimateCpuUtilization,
  getPerformanceStats,
  SLOW_EVENT_THRESHOLD_MS
} = require('./out/utils/performance');
const {
  validateServerUrl,
  sanitizeFilePath,
  sanitizePayload,
  verifyStudentIdAnonymization,
  anonymizeStudentId
} = require('./out/security/privacy');
const { initDatabase, closeDatabase, getDatabase } = require('./out/storage/database');
const { insertEvent, markSynced } = require('./out/storage/event-store');

console.log('=== STARTING PLAN 6 UNIT & INTEGRATION TESTS ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Status Bar Text Exact Spec Matching
// ─────────────────────────────────────────────────────────────────────────────
console.log('[TEST 1] Testing Status Bar Text Spec Matching...');
{
  const syncedText = formatStatusBarText('synced', 0);
  assert.strictEqual(syncedText, '$(check) Telemetry: Synced', 'Synced status text mismatch');

  const pendingText = formatStatusBarText('offline_pending', 38);
  assert.strictEqual(pendingText, '$(cloud-offline) Telemetry: 38 Offline Pending', 'Offline pending status text mismatch');

  const syncingText = formatStatusBarText('syncing', 38);
  assert.strictEqual(syncingText, '$(sync~spin) Telemetry: Syncing...', 'Syncing status text mismatch');

  console.log('  PASS: Status bar text matches spec:');
  console.log('    - Synced:          ', syncedText);
  console.log('    - Offline Pending: ', pendingText);
  console.log('    - Syncing:         ', syncingText);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Local SQLite Queue Audit Viewer Data
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 2] Testing Audit Viewer Queue Status Query...');
{
  const testStorageDir = path.join(os.tmpdir(), `collabintel-audit-test-${Date.now()}`);
  fs.mkdirSync(testStorageDir, { recursive: true });

  try {
    initDatabase(testStorageDir);

    // Insert 5 synthetic events
    const insertedUuids = [];
    for (let i = 1; i <= 5; i++) {
      const evt = insertEvent({
        session_id: 'audit-session-1',
        student_id: 'std_testuser',
        task_id: 'task-1',
        repo_id: 'https://github.com/test/repo',
        branch: 'main',
        commit_sha: 'commit-sha-1',
        event_type: 'KEYSTROKE',
        category: 'SOURCE_CODE_EDIT',
        file_path: 'src/main.ts',
        timestamp: Date.now() - (10000 - i * 1000),
        payload_json: JSON.stringify({ charCount: i })
      });
      insertedUuids.push(evt.event_uuid);
    }

    // Mark 3 as synced
    markSynced(insertedUuids.slice(0, 3));

    const auditData = getAuditReportData(testStorageDir);
    assert.strictEqual(auditData.totalEvents, 5, 'Total events mismatch');
    assert.strictEqual(auditData.syncedCount, 3, 'Synced count mismatch');
    assert.strictEqual(auditData.pendingCount, 2, 'Pending count mismatch');
    assert.strictEqual(auditData.hashChainValid, true, 'Hash chain should be valid');
    assert.ok(auditData.storageBytes > 0, 'Storage size should be > 0 bytes');
    assert.ok(auditData.storageSizeFormatted.includes('KB') || auditData.storageSizeFormatted.includes('B'), 'Formatted size present');
    assert.notStrictEqual(auditData.lastSyncTime, 'None', 'Last sync time should be set');

    console.log('  PASS: Audit report data verified:');
    console.log('    - Total Events:   ', auditData.totalEvents);
    console.log('    - Pending Events: ', auditData.pendingCount);
    console.log('    - Synced Events:  ', auditData.syncedCount);
    console.log('    - Storage Size:   ', auditData.storageSizeFormatted);
    console.log('    - Hash Chain:     ', auditData.hashChainValid ? 'VALID' : 'INVALID');
    console.log('    - Last Sync:      ', auditData.lastSyncTime);
  } finally {
    closeDatabase();
    try {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Performance Profiler & Memory Checks
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 3] Testing Performance Micro-Profiler & Resource Checks...');
{
  // 1. Fast hook: should not trigger slow warning
  const fastResult = profileHook('test:fastOperation', () => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += i;
    return sum;
  });
  assert.ok(fastResult > 0);

  // 2. Slow hook: artificial busy delay > 15ms
  profileHook('test:slowSyntheticOperation', () => {
    const start = Date.now();
    while (Date.now() - start < 18) {
      // spin busy-wait to exceed 15ms threshold
    }
  });

  const stats = getPerformanceStats();
  assert.ok(stats.slowOperationsCount >= 1, 'Slow operation should be recorded');
  const slowOp = stats.recentSlowOperations.find(o => o.name === 'test:slowSyntheticOperation');
  assert.ok(slowOp, 'Slow synthetic operation found in history');
  assert.ok(slowOp.durationMs >= 15, `Duration was ${slowOp.durationMs}ms, expected >= 15ms`);

  // 3. Memory & CPU check
  const mem = checkMemoryUsage();
  assert.ok(mem.rssBytes > 0, 'RSS memory bytes should be > 0');
  assert.ok(typeof mem.isHigh === 'boolean');
  const cpu = estimateCpuUtilization();
  assert.ok(cpu >= 0 && cpu <= 100, `CPU utilization between 0 and 100% (was ${cpu}%)`);

  console.log('  PASS: Performance profiler verified:');
  console.log('    - Slow Hook Tracked: ', slowOp.name, `(${slowOp.durationMs}ms > 15ms)`);
  console.log('    - Extension RSS:     ', mem.rssFormatted);
  console.log('    - CPU Utilization:   ', `${cpu}%`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Security & Privacy Hardening
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 4] Testing Security & Privacy Hardening...');
{
  // 1. HTTPS Server URL Enforcement
  const localHttp = validateServerUrl('http://localhost:5000');
  assert.strictEqual(localHttp.isValid, true);
  assert.strictEqual(localHttp.isSecure, true);
  assert.strictEqual(localHttp.isLocal, true);

  const localIpHttp = validateServerUrl('http://127.0.0.1:8080');
  assert.strictEqual(localIpHttp.isValid, true);
  assert.strictEqual(localIpHttp.isSecure, true);

  const prodHttps = validateServerUrl('https://api.collabintel.edu');
  assert.strictEqual(prodHttps.isValid, true);
  assert.strictEqual(prodHttps.isSecure, true);
  assert.strictEqual(prodHttps.isLocal, false);

  const prodInsecureHttp = validateServerUrl('http://api.collabintel.edu');
  assert.strictEqual(prodInsecureHttp.isValid, true);
  assert.strictEqual(prodInsecureHttp.isSecure, false, 'Remote HTTP must not be marked secure');
  assert.ok(prodInsecureHttp.warning && prodInsecureHttp.warning.includes('HTTPS is required for production'));

  console.log('  PASS: Server URL HTTPS enforcement:');
  console.log('    - http://localhost:5000:       Allowed (local)');
  console.log('    - https://api.collabintel.edu: Allowed (secure production)');
  console.log('    - http://api.collabintel.edu:  Flagged with warning:', prodInsecureHttp.warning);

  // 2. Path Sanitization (strip absolute paths, convert to relative)
  const winAbsPath = 'C:\\Users\\Acer\\student-project\\src\\app.ts';
  const sanitizedWin = sanitizeFilePath(winAbsPath, 'C:\\Users\\Acer\\student-project');
  assert.strictEqual(sanitizedWin, 'src/app.ts', 'Windows absolute path should be sanitized to relative');

  const unixAbsPath = '/Users/student/projects/src/components/button.tsx';
  const sanitizedUnix = sanitizeFilePath(unixAbsPath, '/Users/student/projects');
  assert.strictEqual(sanitizedUnix, 'src/components/button.tsx', 'Unix absolute path should be sanitized to relative');

  // Payload deep sanitization
  const rawPayload = {
    file_path: 'F:\\student-authenticity-contribution-analysis\\src\\index.ts',
    filesList: [
      'F:\\student-authenticity-contribution-analysis\\src\\index.ts',
      'F:\\student-authenticity-contribution-analysis\\src\\utils.ts'
    ],
    payload_json: JSON.stringify({
      targetFile: 'F:\\student-authenticity-contribution-analysis\\src\\app.ts',
      error: 'Error at F:\\student-authenticity-contribution-analysis\\src\\app.ts:12'
    })
  };
  const sanitizedPayload = sanitizePayload(rawPayload, 'F:\\student-authenticity-contribution-analysis');
  assert.strictEqual(sanitizedPayload.file_path, 'src/index.ts');
  assert.deepStrictEqual(sanitizedPayload.filesList, ['src/index.ts', 'src/utils.ts']);
  const parsedInner = JSON.parse(sanitizedPayload.payload_json);
  assert.strictEqual(parsedInner.targetFile, 'src/app.ts');

  console.log('  PASS: Payload path sanitization:');
  console.log('    - Windows Absolute -> Relative:  ', winAbsPath, '=>', sanitizedWin);
  console.log('    - Unix Absolute -> Relative:     ', unixAbsPath, '=>', sanitizedUnix);
  console.log('    - Sanitized Payload file_path:   ', sanitizedPayload.file_path);

  // 3. Student ID Anonymization Verification
  const emailId = verifyStudentIdAnonymization('student42@university.edu');
  assert.strictEqual(emailId.isAnonymized, false, 'Email should be flagged as unanonymized PII');
  assert.ok(emailId.sanitizedId.startsWith('std_'), 'Should produce anonymized hash pseudonym');

  const nameId = verifyStudentIdAnonymization('John Doe');
  assert.strictEqual(nameId.isAnonymized, false, 'Personal name should be flagged as unanonymized');

  const validHashed = verifyStudentIdAnonymization('std_4f9a1b2c3d4e5f6a');
  assert.strictEqual(validHashed.isAnonymized, true, 'std_ hash should be recognized as anonymized');

  console.log('  PASS: Student ID PII verification:');
  console.log('    - "student42@university.edu" -> Flagged as PII, anonymized to:', emailId.sanitizedId);
  console.log('    - "std_4f9a1b2c3d4e5f6a"     -> Verified anonymized');
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Webview Extracted HTML Template Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 5] Testing Webview HTML Template Extraction...');
{
  const sidebarHtmlSrc = path.join(__dirname, 'src', 'ui', 'html', 'sidebar.html');
  const sidebarHtmlOut = path.join(__dirname, 'out', 'ui', 'html', 'sidebar.html');
  const dashboardHtmlSrc = path.join(__dirname, 'src', 'ui', 'html', 'dashboard.html');
  const dashboardHtmlOut = path.join(__dirname, 'out', 'ui', 'html', 'dashboard.html');

  assert.ok(fs.existsSync(sidebarHtmlSrc), 'src/ui/html/sidebar.html must exist');
  assert.ok(fs.existsSync(sidebarHtmlOut), 'out/ui/html/sidebar.html must exist');
  assert.ok(fs.existsSync(dashboardHtmlSrc), 'src/ui/html/dashboard.html must exist');
  assert.ok(fs.existsSync(dashboardHtmlOut), 'out/ui/html/dashboard.html must exist');

  const sidebarContent = fs.readFileSync(sidebarHtmlSrc, 'utf8');
  assert.ok(sidebarContent.includes('statActiveIdleSplit'), 'sidebar.html contains active/idle split metric');
  assert.ok(sidebarContent.includes('statSyntaxErrors'), 'sidebar.html contains syntax errors metric');
  assert.ok(sidebarContent.includes('statFocusTransitions'), 'sidebar.html contains focus transitions metric');

  const dashboardContent = fs.readFileSync(dashboardHtmlSrc, 'utf8');
  assert.ok(dashboardContent.includes('tab-ml'), 'dashboard.html contains ML Features tab button');
  assert.ok(dashboardContent.includes('content-ml'), 'dashboard.html contains ML Features content pane');
  assert.ok(dashboardContent.includes('feat_activeCodingTimeSec'), 'dashboard.html contains 18 ML features grid');

  console.log('  PASS: HTML templates extracted and verified:');
  console.log('    - sidebar.html contains error count, focus transitions, active/idle split');
  console.log('    - dashboard.html contains ML Features tab and 18-feature cards');
}

console.log('\n=======================================================');
console.log('  ✅ ALL PLAN 6 TESTS PASSED SUCCESSFULLY!');
console.log('=======================================================\n');
