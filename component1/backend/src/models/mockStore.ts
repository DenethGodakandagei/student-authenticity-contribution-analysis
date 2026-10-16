// In-Memory & File-Persisted Database Fallback Store
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

export const mockUsers: any[] = [];
export const mockAssignments: any[] = [];
export const mockTeams: any[] = [];
export const mockTasks: any[] = [];
export const mockVscodeSessions: any[] = [];
export const mockGitActivities: any[] = [];
export const mockAnalyticsReports: any[] = [];
export const mockTelemetryEvents: any[] = [];

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'mock_store.json');

// Disk persistence disabled: Real data is saved directly to MongoDB
export const saveToDisk = () => {};

export const loadFromDisk = (): boolean => {
  return false;
};


// Helper to generate mongo-like string IDs
export const generateId = (): string => {
  return new mongoose.Types.ObjectId().toString();
};

// Check if mongoose is connected
export const isDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Seed initial mockup data if memory store is empty
export const seedMockDatabase = () => {
  if (loadFromDisk()) {
    return;
  }

  // Clear any existing mock data to prevent duplicates
  mockUsers.length = 0;
  mockAssignments.length = 0;
  mockTeams.length = 0;
  mockTasks.length = 0;
  mockVscodeSessions.length = 0;
  mockGitActivities.length = 0;
  mockAnalyticsReports.length = 0;

  console.log('Seeding mock database fallback in-memory arrays and saving to disk...');

  const defaultPassword = bcrypt.hashSync('password123', 10);
  const lecturerId = '667790901f95305cc857f001';
  const assignmentId = '6677b2b22f95305cc857f101';
  const teamId = '6677c3c33f95305cc857f201';

  // 1. Seed Users
  mockUsers.push(
    { _id: lecturerId, name: 'Dr. Sarah Jenkins', email: 'sarah.jenkins@university.edu', password: defaultPassword, role: 'lecturer' },
    { _id: '667790901f95305cc857f099', name: 'Lecturer 2', email: 'lecture2@gmail.com', password: defaultPassword, role: 'lecturer' },
    { _id: '6677a1a11f95305cc857f002', name: 'Alex Rivera', email: 'alex.rivera@student.edu', password: defaultPassword, role: 'student' },
    { _id: '6677a1a11f95305cc857f003', name: 'Chloe Chen', email: 'chloe.chen@student.edu', password: defaultPassword, role: 'student' },
    { _id: '6677a1a11f95305cc857f004', name: 'Marcus Vance', email: 'marcus.vance@student.edu', password: defaultPassword, role: 'student' },
    { _id: '6677a1a11f95305cc857f005', name: 'Emma Watson', email: 'emma.watson@student.edu', password: defaultPassword, role: 'student' }
  );

  // 2. Seed Assignment
  mockAssignments.push({
    _id: assignmentId,
    title: 'Distributed System Development (Group Project)',
    description: 'Implement a resilient microservices-based chat application.',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    assignmentType: 'team',
    weights: { git: 40, vscode: 30, task: 20, collab: 10 },
    invitationCode: 'DIST-901',
    createdBy: lecturerId,
    createdAt: new Date('2026-06-10T08:00:00Z')
  });

  // 3. Seed Team
  mockTeams.push({
    _id: teamId,
    name: 'ByteCraft Core Team',
    assignment: assignmentId,
    inviteCode: 'BYTE-77',
    repositoryUrl: 'https://github.com/university-se-labs/bytecraft-chat-app',
    members: [
      { student: '6677a1a11f95305cc857f002', gitUsername: 'alex-rivera-dev' },
      { student: '6677a1a11f95305cc857f003', gitUsername: 'chloe-c' },
      { student: '6677a1a11f95305cc857f004', gitUsername: 'marcusv-codes' },
      { student: '6677a1a11f95305cc857f005', gitUsername: 'emma-w-student' }
    ],
    createdAt: new Date('2026-06-12T14:30:00Z')
  });

  // 4. Seed Tasks
  mockTasks.push(
    { _id: generateId(), title: 'Setup Docker compose & network architecture', status: 'done', assignedTo: '6677a1a11f95305cc857f002', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Design database schema and replication logic', status: 'done', assignedTo: '6677a1a11f95305cc857f002', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Implement Redis PubSub communication', status: 'done', assignedTo: '6677a1a11f95305cc857f003', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Build Web UI rooms chat page', status: 'inprogress', assignedTo: '6677a1a11f95305cc857f003', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Create REST authorization middleware', status: 'done', assignedTo: '6677a1a11f95305cc857f004', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Write integration test suites', status: 'todo', assignedTo: '6677a1a11f95305cc857f004', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Configure CI/CD automated test pipeline', status: 'todo', assignedTo: '6677a1a11f95305cc857f005', team: teamId, assignment: assignmentId },
    { _id: generateId(), title: 'Documentation & Architecture Diagrams', status: 'todo', assignedTo: '6677a1a11f95305cc857f005', team: teamId, assignment: assignmentId }
  );

  // 5. Seed VS Code Sessions
  mockVscodeSessions.push(
    // Alex Rivera - Authentic Manual Coder
    {
      _id: generateId(),
      student: '6677a1a11f95305cc857f002',
      assignment: assignmentId,
      team: teamId,
      sessionStart: new Date('2026-06-15T09:00:00Z'),
      sessionEnd: new Date('2026-06-15T12:30:00Z'),
      durationMinutes: 210,
      keystrokes: 8400,
      filesEdited: ['docker-compose.yml', 'server.ts'],
      filesCreated: ['Dockerfile'],
      linesAdded: 340,
      linesRemoved: 20,
      isOffline: false,
      pasteCount: 1,
      charactersPasted: 80,
      fileActivities: [
        { filePath: 'Dockerfile', action: 'created', manualChars: 1200, pasteChars: 0, aiChars: 0, manualKeystrokes: 1200, pasteEvents: 0, aiEvents: 0, typingProvenance: 'manual', linesAdded: 60, linesRemoved: 0 },
        { filePath: 'docker-compose.yml', action: 'edited', manualChars: 2400, pasteChars: 80, aiChars: 0, manualKeystrokes: 2300, pasteEvents: 1, aiEvents: 0, typingProvenance: 'manual', linesAdded: 140, linesRemoved: 10 },
        { filePath: 'server.ts', action: 'edited', manualChars: 4800, pasteChars: 0, aiChars: 0, manualKeystrokes: 4900, pasteEvents: 0, aiEvents: 0, typingProvenance: 'manual', linesAdded: 140, linesRemoved: 10 }
      ],
      codingProvenance: { manualPercent: 98, pastePercent: 2, aiPercent: 0, style: 'Manual Typing' }
    },
    {
      _id: generateId(),
      student: '6677a1a11f95305cc857f002',
      assignment: assignmentId,
      team: teamId,
      sessionStart: new Date('2026-06-16T14:00:00Z'),
      sessionEnd: new Date('2026-06-16T18:00:00Z'),
      durationMinutes: 240,
      keystrokes: 11200,
      filesEdited: ['db/mongo.ts', 'server.ts'],
      filesCreated: ['db/mongo.ts'],
      linesAdded: 450,
      linesRemoved: 60,
      isOffline: true,
      pasteCount: 2,
      charactersPasted: 120,
      fileActivities: [
        { filePath: 'db/mongo.ts', action: 'created', manualChars: 5600, pasteChars: 60, aiChars: 0, manualKeystrokes: 5700, pasteEvents: 1, aiEvents: 0, typingProvenance: 'manual', linesAdded: 280, linesRemoved: 20 },
        { filePath: 'server.ts', action: 'edited', manualChars: 5400, pasteChars: 60, aiChars: 0, manualKeystrokes: 5500, pasteEvents: 1, aiEvents: 0, typingProvenance: 'manual', linesAdded: 170, linesRemoved: 40 }
      ],
      codingProvenance: { manualPercent: 97, pastePercent: 3, aiPercent: 0, style: 'Manual Typing' }
    },
    // Chloe Chen - Balanced Developer with AI assistance
    {
      _id: generateId(),
      student: '6677a1a11f95305cc857f003',
      assignment: assignmentId,
      team: teamId,
      sessionStart: new Date('2026-06-15T10:00:00Z'),
      sessionEnd: new Date('2026-06-15T13:00:00Z'),
      durationMinutes: 180,
      keystrokes: 5200,
      filesEdited: ['redis/client.ts'],
      filesCreated: ['redis/client.ts'],
      linesAdded: 150,
      linesRemoved: 10,
      isOffline: false,
      pasteCount: 1,
      charactersPasted: 150,
      fileActivities: [
        { filePath: 'redis/client.ts', action: 'created', manualChars: 3800, pasteChars: 150, aiChars: 1250, manualKeystrokes: 3900, pasteEvents: 1, aiEvents: 6, typingProvenance: 'ai_assisted', linesAdded: 150, linesRemoved: 10 }
      ],
      codingProvenance: { manualPercent: 73, pastePercent: 3, aiPercent: 24, style: 'AI-Assisted Development' }
    },
    {
      _id: generateId(),
      student: '6677a1a11f95305cc857f003',
      assignment: assignmentId,
      team: teamId,
      sessionStart: new Date('2026-06-17T15:00:00Z'),
      sessionEnd: new Date('2026-06-17T19:30:00Z'),
      durationMinutes: 270,
      keystrokes: 9800,
      filesEdited: ['components/chat.tsx', 'redis/pubsub.ts'],
      filesCreated: ['redis/pubsub.ts', 'components/chat.tsx'],
      linesAdded: 520,
      linesRemoved: 40,
      isOffline: false,
      pasteCount: 3,
      charactersPasted: 350,
      fileActivities: [
        { filePath: 'redis/pubsub.ts', action: 'created', manualChars: 4200, pasteChars: 150, aiChars: 1100, manualKeystrokes: 4300, pasteEvents: 1, aiEvents: 5, typingProvenance: 'ai_assisted', linesAdded: 210, linesRemoved: 10 },
        { filePath: 'components/chat.tsx', action: 'created', manualChars: 4400, pasteChars: 200, aiChars: 1500, manualKeystrokes: 4500, pasteEvents: 2, aiEvents: 7, typingProvenance: 'mixed', linesAdded: 310, linesRemoved: 30 }
      ],
      codingProvenance: { manualPercent: 74, pastePercent: 4, aiPercent: 22, style: 'AI-Assisted Development' }
    },
    // Marcus Vance - Manual Systems Engineer
    {
      _id: generateId(),
      student: '6677a1a11f95305cc857f004',
      assignment: assignmentId,
      team: teamId,
      sessionStart: new Date('2026-06-16T10:00:00Z'),
      sessionEnd: new Date('2026-06-16T12:00:00Z'),
      durationMinutes: 120,
      keystrokes: 3100,
      filesEdited: ['middleware/auth.ts'],
      filesCreated: ['middleware/auth.ts'],
      linesAdded: 120,
      linesRemoved: 5,
      isOffline: false,
      pasteCount: 0,
      charactersPasted: 0,
      fileActivities: [
        { filePath: 'middleware/auth.ts', action: 'created', manualChars: 3100, pasteChars: 0, aiChars: 0, manualKeystrokes: 3100, pasteEvents: 0, aiEvents: 0, typingProvenance: 'manual', linesAdded: 120, linesRemoved: 5 }
      ],
      codingProvenance: { manualPercent: 100, pastePercent: 0, aiPercent: 0, style: 'Manual Typing' }
    },
    // Emma Watson (Free-Rider Anomaly: Bulk Copy-Paste & 0 Typing)
    {
      _id: generateId(),
      student: '6677a1a11f95305cc857f005',
      assignment: assignmentId,
      team: teamId,
      sessionStart: new Date('2026-06-18T10:00:00Z'),
      sessionEnd: new Date('2026-06-18T10:15:00Z'),
      durationMinutes: 15,
      keystrokes: 10,
      filesEdited: ['README.md'],
      filesCreated: [],
      linesAdded: 200,
      linesRemoved: 1,
      isOffline: false,
      pasteCount: 2,
      charactersPasted: 800,
      fileActivities: [
        { filePath: 'README.md', action: 'edited', manualChars: 10, pasteChars: 800, aiChars: 0, manualKeystrokes: 10, pasteEvents: 2, aiEvents: 0, typingProvenance: 'copy_paste', linesAdded: 200, linesRemoved: 1 }
      ],
      codingProvenance: { manualPercent: 1, pastePercent: 99, aiPercent: 0, style: 'Heavy Copy-Paste' }
    }
  );

  // 6. Seed Git Activities
  mockGitActivities.push(
    // Alex Rivera
    {
      _id: generateId(),
      team: teamId,
      student: '6677a1a11f95305cc857f002',
      gitUsername: 'alex-rivera-dev',
      commitHash: 'a7b32f91e84a2c53bde298d023f038c92a912e73',
      commitMessage: 'feat: setup container orchestrator configurations and project outline',
      commitDate: new Date('2026-06-15T13:00:00Z'),
      linesAdded: 340,
      linesRemoved: 20,
      filesChanged: 3,
      activityType: 'commit'
    },
    {
      _id: generateId(),
      team: teamId,
      student: '6677a1a11f95305cc857f002',
      gitUsername: 'alex-rivera-dev',
      commitHash: 'fa821c172bf42039ab6e9de80cd7aef14e1f72ca',
      commitMessage: 'feat: setup replica set mongodb cluster for high availability',
      commitDate: new Date('2026-06-17T09:15:00Z'),
      linesAdded: 450,
      linesRemoved: 60,
      filesChanged: 2,
      activityType: 'commit'
    },
    // Chloe Chen
    {
      _id: generateId(),
      team: teamId,
      student: '6677a1a11f95305cc857f003',
      gitUsername: 'chloe-c',
      commitHash: 'd39aef7c140982bc92a839da47e09ea18dfa1a8c',
      commitMessage: 'feat: setup Redis PubSub messaging gateway',
      commitDate: new Date('2026-06-15T14:30:00Z'),
      linesAdded: 150,
      linesRemoved: 10,
      filesChanged: 1,
      activityType: 'commit'
    },
    {
      _id: generateId(),
      team: teamId,
      student: '6677a1a11f95305cc857f003',
      gitUsername: 'chloe-c',
      commitHash: 'b482381f9a2e374bd9cf829103e91823abfd82d2',
      commitMessage: 'feat: add websocket handlers for messaging UI',
      commitDate: new Date('2026-06-17T20:00:00Z'),
      linesAdded: 520,
      linesRemoved: 40,
      filesChanged: 2,
      activityType: 'commit'
    },
    {
      _id: generateId(),
      team: teamId,
      student: '6677a1a11f95305cc857f003',
      gitUsername: 'chloe-c',
      commitHash: '0000000000000000000000000000000000000000',
      commitMessage: 'Pull Request #2: Merge websocket rooms functionality',
      commitDate: new Date('2026-06-17T20:30:00Z'),
      linesAdded: 0,
      linesRemoved: 0,
      filesChanged: 0,
      activityType: 'pr_merge',
      prId: 2,
      prTitle: 'WebSocket Rooms Integration'
    },
    // Marcus Vance
    {
      _id: generateId(),
      team: teamId,
      student: '6677a1a11f95305cc857f004',
      gitUsername: 'marcusv-codes',
      commitHash: '98d1a1b12b2e3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      commitMessage: 'feat: secure private API gateways with JWT middleware',
      commitDate: new Date('2026-06-16T12:30:00Z'),
      linesAdded: 120,
      linesRemoved: 5,
      filesChanged: 1,
      activityType: 'commit'
    }
  );

  console.log(`Mock database populated: Users=${mockUsers.length}, Sessions=${mockVscodeSessions.length}, GitActivities=${mockGitActivities.length}`);
};

// Mock seeding disabled: All tracking and analytics must be saved directly to MongoDB.

