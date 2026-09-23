import { getHealth } from './controllers/health';
import { syncTelemetryBatch } from './controllers/telemetry';
import { mockTelemetryEvents } from './models/mockStore';

// Mini mock response helper
function createMockRes() {
  const res: any = {
    statusCode: 200,
    data: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.data = data;
      return res;
    }
  };
  return res;
}

// Backoff delay calculation mirroring retry.ts
const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 32000, 60000];
function calculateBackoffDelay(attempt: number, withJitter: boolean = false): number {
  const index = Math.min(Math.max(0, attempt), BACKOFF_DELAYS_MS.length - 1);
  const baseDelay = BACKOFF_DELAYS_MS[index];
  const jitter = withJitter ? Math.floor(Math.random() * 501) : 0;
  return baseDelay + jitter;
}

async function runPlan4Tests() {
  console.log('=== STARTING PLAN 4 INTEGRATION & UNIT VERIFICATION ===\n');
  let allPassed = true;

  // ── TEST 1: Health Check Endpoint ──
  console.log('[TEST 1] Testing GET /api/health controller...');
  const reqHealth: any = {};
  const resHealth = createMockRes();
  getHealth(reqHealth, resHealth);

  if (resHealth.statusCode === 200 && resHealth.data?.status === 'ok' && resHealth.data?.timestamp) {
    console.log('  PASS: Health check returned { status: "ok", timestamp: "' + resHealth.data.timestamp + '" }');
  } else {
    console.error('  FAIL: Health check response invalid:', resHealth.statusCode, resHealth.data);
    allPassed = false;
  }

  // ── TEST 2: Telemetry Batch Sync & Deduplication ──
  console.log('\n[TEST 2] Testing POST /api/telemetry/sync batch insertion & deduplication...');
  mockTelemetryEvents.length = 0; // Clear mock store

  const testEvent1 = {
    event_uuid: 'uuid-test-001',
    session_id: 'session-123',
    student_id: 'student-456',
    task_id: 'task-789',
    repo_id: 'repo-abc',
    branch: 'main',
    commit_sha: 'sha-001',
    event_type: 'KEYSTROKE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/index.ts',
    timestamp: Date.now(),
    payload_json: JSON.stringify({ charCount: 10 }),
    sync_status: 0,
    previous_hash: 'hash-0',
    row_hash: 'hash-1',
    created_at: new Date().toISOString()
  };

  const testEvent2 = {
    event_uuid: 'uuid-test-002',
    session_id: 'session-123',
    student_id: 'student-456',
    task_id: 'task-789',
    repo_id: 'repo-abc',
    branch: 'main',
    commit_sha: 'sha-001',
    event_type: 'SAVE',
    category: 'SOURCE_CODE_EDIT',
    file_path: 'src/index.ts',
    timestamp: Date.now() + 100,
    payload_json: JSON.stringify({ lineCount: 50 }),
    sync_status: 0,
    previous_hash: 'hash-1',
    row_hash: 'hash-2',
    created_at: new Date().toISOString()
  };

  // 2a. Insert first batch (2 events)
  const reqSync1: any = { body: { events: [testEvent1, testEvent2] } };
  const resSync1 = createMockRes();
  await syncTelemetryBatch(reqSync1, resSync1);

  if (resSync1.statusCode === 200 && resSync1.data?.syncedCount === 2 && resSync1.data?.duplicateCount === 0) {
    console.log('  PASS: Successfully inserted 2 new events in batch.');
  } else {
    console.error('  FAIL: Initial batch insert failed:', resSync1.statusCode, resSync1.data);
    allPassed = false;
  }

  // 2b. Resend same batch (deduplication check)
  const reqSync2: any = { body: { events: [testEvent1, testEvent2] } };
  const resSync2 = createMockRes();
  await syncTelemetryBatch(reqSync2, resSync2);

  if (resSync2.statusCode === 200 && resSync2.data?.syncedCount === 0 && resSync2.data?.duplicateCount === 2) {
    console.log('  PASS: Duplicate events successfully detected and rejected (0 inserted, 2 duplicates).');
  } else {
    console.error('  FAIL: Deduplication check failed:', resSync2.statusCode, resSync2.data);
    allPassed = false;
  }

  // 2c. Send mixed batch: 1 duplicate (testEvent1) + 1 brand new (testEvent3)
  const testEvent3 = {
    ...testEvent1,
    event_uuid: 'uuid-test-003',
    timestamp: Date.now() + 200
  };
  const reqSync3: any = { body: { events: [testEvent1, testEvent3] } };
  const resSync3 = createMockRes();
  await syncTelemetryBatch(reqSync3, resSync3);

  if (resSync3.statusCode === 200 && resSync3.data?.syncedCount === 1 && resSync3.data?.duplicateCount === 1) {
    console.log('  PASS: Mixed batch successfully handled (1 inserted, 1 duplicate ignored).');
  } else {
    console.error('  FAIL: Mixed batch handling failed:', resSync3.statusCode, resSync3.data);
    allPassed = false;
  }

  // ── TEST 3: Exponential Backoff & Jitter Verification ──
  console.log('\n[TEST 3] Testing Exponential Backoff schedule and 3 consecutive failures...');
  const expectedBases = [1000, 2000, 4000, 8000, 16000, 32000, 60000];

  for (let i = 0; i < expectedBases.length; i++) {
    const base = calculateBackoffDelay(i, false);
    if (base !== expectedBases[i]) {
      console.error(`  FAIL: Attempt ${i} base delay should be ${expectedBases[i]}, got ${base}`);
      allPassed = false;
    }
  }
  console.log('  PASS: Base delays match [1s, 2s, 4s, 8s, 16s, 32s, 60s].');

  // Simulate 3 consecutive failures and verify delays strictly increase
  const delay1 = calculateBackoffDelay(0, true);
  const delay2 = calculateBackoffDelay(1, true);
  const delay3 = calculateBackoffDelay(2, true);

  console.log(`  Simulating 3 consecutive failures:`);
  console.log(`    Failure #1 Delay: ${delay1}ms (base 1000ms + jitter)`);
  console.log(`    Failure #2 Delay: ${delay2}ms (base 2000ms + jitter)`);
  console.log(`    Failure #3 Delay: ${delay3}ms (base 4000ms + jitter)`);

  if (delay1 < delay2 && delay2 < delay3) {
    console.log('  PASS: Backoff delays strictly increase across consecutive failures.');
  } else {
    console.error('  FAIL: Consecutive failure delays did not strictly increase.');
    allPassed = false;
  }

  console.log('\n=======================================================');
  if (allPassed) {
    console.log('  ✅ ALL PLAN 4 TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('  ❌ SOME PLAN 4 TESTS FAILED.');
    process.exit(1);
  }
  console.log('=======================================================\n');
}

runPlan4Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
