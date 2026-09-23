const assert = require('assert');
const { computeWindowFeatures } = require('./out/features/feature-calculator');
const {
  groupEventsIntoSessions,
  calculateFileSimilarity,
  reconcileEventsWithCommits
} = require('./out/git/reconciler');

console.log('=== STARTING PLAN 5 UNIT & INTEGRATION TESTS ===\n');
let allPassed = true;

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: All 18 Features Computation
// ─────────────────────────────────────────────────────────────────────────────
console.log('[TEST 1] Testing 18 ML Features Computation...');

const now = Date.now();
const windowStart = now - (5 * 60 * 1000); // 5 min ago
const windowEnd = now;

// Synthetic events within the 5-minute window
const syntheticEvents = [
  // 1. Keystroke at minute 1
  {
    event_uuid: 'evt-1',
    session_id: 'session-1',
    event_type: 'KEYSTROKE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/app.ts',
    timestamp: windowStart + 60000,
    payload_json: JSON.stringify({ charCount: 1, netInsertedChars: 1 })
  },
  // 2. Keystroke 2s later
  {
    event_uuid: 'evt-2',
    session_id: 'session-1',
    event_type: 'KEYSTROKE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/app.ts',
    timestamp: windowStart + 62000,
    payload_json: JSON.stringify({ charCount: 1, netInsertedChars: 1 })
  },
  // 3. Paste burst at minute 2
  {
    event_uuid: 'evt-3',
    session_id: 'session-1',
    event_type: 'PASTE_BURST',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/app.ts',
    timestamp: windowStart + 120000,
    payload_json: JSON.stringify({ charCount: 85, netInsertedChars: 85 })
  },
  // 4. File edit / deletion at minute 2.5
  {
    event_uuid: 'evt-4',
    session_id: 'session-1',
    event_type: 'KEYSTROKE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/app.ts',
    timestamp: windowStart + 150000,
    payload_json: JSON.stringify({ charCount: 5, netInsertedChars: 5, netDeletedChars: 10 })
  },
  // 5. File create
  {
    event_uuid: 'evt-5',
    session_id: 'session-1',
    event_type: 'FILE_CREATE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/utils.ts',
    timestamp: windowStart + 160000,
    payload_json: '{}'
  },
  // 6. Explicit save
  {
    event_uuid: 'evt-6',
    session_id: 'session-1',
    event_type: 'SAVE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/app.ts',
    timestamp: windowStart + 170000,
    payload_json: '{}'
  },
  // 7. Focus event
  {
    event_uuid: 'evt-7',
    session_id: 'session-1',
    event_type: 'FOCUS',
    category: 'SYSTEM',
    file_path: '',
    timestamp: windowStart + 180000,
    payload_json: '{}'
  },
  // 8. Diagnostic error
  {
    event_uuid: 'evt-8',
    session_id: 'session-1',
    event_type: 'DIAGNOSTIC',
    category: 'SYSTEM',
    file_path: 'src/app.ts',
    timestamp: windowStart + 190000,
    payload_json: JSON.stringify({ severity: 'error', currentErrorCount: 1, appearedAt: windowStart + 190000 })
  },
  // 9. Diagnostic resolved 15s later
  {
    event_uuid: 'evt-9',
    session_id: 'session-1',
    event_type: 'DIAGNOSTIC_RESOLVED',
    category: 'SYSTEM',
    file_path: 'src/app.ts',
    timestamp: windowStart + 205000,
    payload_json: JSON.stringify({ appearedAt: windowStart + 190000, resolvedAt: windowStart + 205000 })
  },
  // 10. Git commit
  {
    event_uuid: 'evt-10',
    session_id: 'session-1',
    event_type: 'GIT_COMMIT',
    category: 'SYSTEM',
    file_path: '',
    timestamp: windowStart + 240000,
    payload_json: JSON.stringify({ action: 'commit_detected' })
  }
];

const windowFeatures = computeWindowFeatures(syntheticEvents, windowStart, windowEnd, 'session-1');
const f = windowFeatures.features;

const expectedFeatureKeys = [
  'activeCodingTimeSec',
  'idleTimeSec',
  'sessionDurationSec',
  'activeTypingDurationSec',
  'keystrokeCount',
  'pasteCount',
  'pastedCharCount',
  'pasteToKeystrokeRatio',
  'typingVelocity',
  'netInsertedChars',
  'netDeletedChars',
  'codeChurnRatio',
  'fileModificationFreq',
  'fileCreateDeleteCount',
  'explicitSaveCount',
  'syntaxErrorCount',
  'errorResolutionDurationSec',
  'windowFocusTransitions',
  'gitOperationsCount'
];

// Check all 18 keys exist
let missingKeys = [];
for (const key of expectedFeatureKeys) {
  if (f[key] === undefined || isNaN(f[key])) {
    missingKeys.push(key);
  }
}

if (missingKeys.length === 0) {
  console.log(`  PASS: All 18 ML feature keys present and numeric.`);
} else {
  console.error(`  FAIL: Missing or invalid feature keys:`, missingKeys);
  allPassed = false;
}

// Verify values are reasonable
console.log('  Computed Feature Values:');
console.log(`    1. Active Coding Time: ${f.activeCodingTimeSec}s`);
console.log(`    2. Idle Time: ${f.idleTimeSec}s`);
console.log(`    3. Session Duration: ${f.sessionDurationSec}s`);
console.log(`    4. Active Typing Duration: ${f.activeTypingDurationSec}s`);
console.log(`    5. Keystroke Count: ${f.keystrokeCount}`);
console.log(`    6. Paste Count: ${f.pasteCount}`);
console.log(`    7. Pasted Chars: ${f.pastedCharCount}`);
console.log(`    8. Paste/Keystroke Ratio: ${f.pasteToKeystrokeRatio}, Velocity: ${f.typingVelocity} c/s`);
console.log(`    9. Net Inserted Chars: ${f.netInsertedChars}`);
console.log(`    10. Net Deleted Chars: ${f.netDeletedChars}`);
console.log(`    11. Code Churn Ratio: ${f.codeChurnRatio}`);
console.log(`    12. File Modification Freq: ${f.fileModificationFreq}`);
console.log(`    13. File Create/Delete Count: ${f.fileCreateDeleteCount}`);
console.log(`    14. Explicit Save Count: ${f.explicitSaveCount}`);
console.log(`    15. Syntax Error Count: ${f.syntaxErrorCount}`);
console.log(`    16. Error Resolution Duration: ${f.errorResolutionDurationSec}s`);
console.log(`    17. Focus Transitions: ${f.windowFocusTransitions}`);
console.log(`    18. Git Operations Count: ${f.gitOperationsCount}`);

assert.strictEqual(f.keystrokeCount, 3, 'Keystroke count should be 3');
assert.strictEqual(f.pasteCount, 1, 'Paste count should be 1');
assert.strictEqual(f.pastedCharCount, 85, 'Pasted char count should be 85');
assert.strictEqual(f.explicitSaveCount, 1, 'Explicit save count should be 1');
assert.strictEqual(f.fileCreateDeleteCount, 1, 'File create count should be 1');
assert.strictEqual(f.syntaxErrorCount, 1, 'Syntax error count should be 1');
assert.strictEqual(f.errorResolutionDurationSec, 15, 'Error resolution duration should be 15s');
assert.strictEqual(f.windowFocusTransitions, 1, 'Focus transitions should be 1');
assert.strictEqual(f.gitOperationsCount, 1, 'Git operations count should be 1');
console.log('  PASS: Feature values accurately match event telemetry.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Temporal Reconciliation & Proximity Clustering
// ─────────────────────────────────────────────────────────────────────────────
console.log('[TEST 2] Testing Temporal Reconciliation Algorithm...');

// Create 2 clusters: Session A (near commit 1) and Session B (separated by 10 mins)
const sessionAEStartTime = now - 20 * 60 * 1000;
const sessionBStartTime = now - 5 * 60 * 1000;

const sessionAEvents = [
  {
    event_uuid: 'a1',
    session_id: 'sess-A',
    event_type: 'KEYSTROKE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/auth.ts',
    timestamp: sessionAEStartTime,
    payload_json: JSON.stringify({ charCount: 20 })
  },
  {
    event_uuid: 'a2',
    session_id: 'sess-A',
    event_type: 'SAVE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/auth.ts',
    timestamp: sessionAEStartTime + 60000,
    payload_json: '{}'
  }
];

const sessionBEvents = [
  {
    event_uuid: 'b1',
    session_id: 'sess-B',
    event_type: 'KEYSTROKE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/dashboard.ts',
    timestamp: sessionBStartTime,
    payload_json: JSON.stringify({ charCount: 50 })
  }
];

const allEvents = [...sessionAEvents, ...sessionBEvents];
const sessions = groupEventsIntoSessions(allEvents, 5 * 60 * 1000);

assert.strictEqual(sessions.length, 2, 'Should group into 2 distinct sessions based on proximity');
console.log(`  PASS: Event clustering correctly formed 2 sessions separated by >5 min.`);

// Test Commits
const commits = [
  {
    hash: 'commit-sha-aaa',
    message: 'Add auth module',
    date: new Date(sessionAEStartTime + 120000).toISOString(), // 2 mins after session A
    filesChanged: 1,
    insertions: 25,
    deletions: 0,
    author: 'Student A',
    authorEmail: 'student@example.com',
    branch: 'main',
    isMerge: false,
    filesList: ['src/auth.ts']
  }
];

const reconciled = reconcileEventsWithCommits(allEvents, commits, {
  proximityGapMs: 5 * 60 * 1000,
  commitWindowMs: 15 * 60 * 1000
});

assert.strictEqual(reconciled.length, 2);
assert.strictEqual(reconciled[0].matchedCommit?.hash, 'commit-sha-aaa', 'Session A should map to commit-sha-aaa');
console.log(`  PASS: Session A reconciled to commit-sha-aaa via temporal proximity (score: ${reconciled[0].matchScore}).`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Squashed Commit / Rebase Signature Matching
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 3] Testing Squashed / Rebased Commit File-Diff Signature Matching...');

// Suppose Session B touched 'src/dashboard.ts', but the developer squashed or rebased
// resulting in a commit later or with altered date, but containing 'src/dashboard.ts'
const squashedCommit = {
  hash: 'commit-squashed-999',
  message: 'Squashed feature commit',
  date: new Date(now + 60000).toISOString(), // future or altered timestamp
  filesChanged: 2,
  insertions: 100,
  deletions: 10,
  author: 'Student B',
  authorEmail: 'studentB@example.com',
  branch: 'main',
  isMerge: false,
  filesList: ['src/dashboard.ts', 'src/styles.css']
};

const similarity = calculateFileSimilarity(['src/dashboard.ts'], ['src/dashboard.ts', 'src/styles.css']);
console.log(`  Jaccard file similarity: ${similarity} (1 shared / 2 total)`);
assert.strictEqual(similarity, 0.5, 'Jaccard similarity should be 0.5');

const reconciledWithSquash = reconcileEventsWithCommits(sessionBEvents, [squashedCommit], {
  proximityGapMs: 5 * 60 * 1000,
  commitWindowMs: 5 * 60 * 1000, // tight window so temporal proximity alone won't match easily
  minSimilarityThreshold: 0.4
});

assert.strictEqual(reconciledWithSquash.length, 1);
assert.strictEqual(reconciledWithSquash[0].matchedCommit?.hash, 'commit-squashed-999');
console.log(`  PASS: Squashed commit successfully reconciled via file-diff signature (isSquashedOrRebased=${reconciledWithSquash[0].isSquashedOrRebased}).`);

console.log('\n=======================================================');
console.log('  ✅ ALL PLAN 5 TESTS PASSED SUCCESSFULLY!');
console.log('=======================================================\n');
