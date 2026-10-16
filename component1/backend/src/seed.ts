import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Assignment, Team, Task, VSCodeSession, GitActivity, AnalyticsReport } from './models';
import { calculateAssignmentAnalytics } from './lib/scoring';
import { connectDB } from './config/db';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await connectDB();

    console.log('Clearing existing collections in MongoDB Atlas...');
    await User.deleteMany({});
    await Assignment.deleteMany({});
    await Team.deleteMany({});
    await Task.deleteMany({});
    await VSCodeSession.deleteMany({});
    await GitActivity.deleteMany({});
    await AnalyticsReport.deleteMany({});
    console.log('Database cleared.');

    // 1. Create Lecturer
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const lecturerId = new mongoose.Types.ObjectId();
    const lecturer = new User({
      _id: lecturerId,
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@university.edu',
      password: hashedPassword,
      role: 'lecturer',
      createdAt: new Date('2026-06-01T09:00:00Z')
    });
    await lecturer.save();
    console.log('Lecturer seeded.');

    // 2. Create Student users
    const studentData = [
      { id: '6677a1a11f95305cc857f002', name: 'Alex Rivera', email: 'alex.rivera@student.edu', git: 'alex-rivera-dev' },
      { id: '6677a1a11f95305cc857f003', name: 'Chloe Chen', email: 'chloe.chen@student.edu', git: 'chloe-c' },
      { id: '6677a1a11f95305cc857f004', name: 'Marcus Vance', email: 'marcus.vance@student.edu', git: 'marcusv-codes' },
      { id: '6677a1a11f95305cc857f005', name: 'Emma Watson', email: 'emma.watson@student.edu', git: 'emma-w-student' },
    ];

    const studentIds: string[] = [];
    for (const st of studentData) {
      const student = new User({
        _id: new mongoose.Types.ObjectId(st.id),
        name: st.name,
        email: st.email,
        password: hashedPassword,
        role: 'student',
        createdAt: new Date('2026-06-01T10:00:00Z')
      });
      await student.save();
      studentIds.push(st.id);
    }
    console.log('Students seeded.');

    // 3. Create Assignment
    const assignmentId = new mongoose.Types.ObjectId('6677b2b22f95305cc857f101');
    const assignment = new Assignment({
      _id: assignmentId,
      title: 'Distributed System Development (Group Project)',
      description: 'Implement a resilient microservices-based chat application with caching, replication, and high availability. Must track development through VS Code and commit to the team repository.',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
      assignmentType: 'team',
      weights: {
        git: 40,
        vscode: 30,
        task: 20,
        collab: 10
      },
      invitationCode: 'DIST-901',
      createdBy: lecturerId,
      createdAt: new Date('2026-06-10T08:00:00Z')
    });
    await assignment.save();
    console.log('Assignment seeded.');

    // 4. Create Team
    const teamId = new mongoose.Types.ObjectId('6677c3c33f95305cc857f201');
    const team = new Team({
      _id: teamId,
      name: 'ByteCraft Core Team',
      assignment: assignmentId,
      inviteCode: 'BYTE-77',
      repositoryUrl: 'https://github.com/university-se-labs/bytecraft-chat-app',
      members: studentData.map(st => ({
        student: new mongoose.Types.ObjectId(st.id),
        gitUsername: st.git
      })),
      createdAt: new Date('2026-06-12T14:30:00Z')
    });
    await team.save();
    console.log('Team seeded.');

    // 5. Create Kanban Tasks
    const tasksData = [
      { title: 'Setup Docker compose & network architecture', desc: 'Create environment orchestration scripts', status: 'done', assignedTo: '6677a1a11f95305cc857f002' },
      { title: 'Design database schema and replication logic', desc: 'Setup primary-secondary Mongo clusters', status: 'done', assignedTo: '6677a1a11f95305cc857f002' },
      { title: 'Implement Redis PubSub communication', desc: 'Handle chat message delivery between rooms', status: 'done', assignedTo: '6677a1a11f95305cc857f003' },
      { title: 'Build Web UI rooms chat page', desc: 'Connect frontend to WebSockets backend', status: 'inprogress', assignedTo: '6677a1a11f95305cc857f003' },
      { title: 'Create REST authorization middleware', desc: 'JWT user validations and route protection', status: 'done', assignedTo: '6677a1a11f95305cc857f004' },
      { title: 'Write integration test suites', desc: 'Verify user messaging lifecycle and latencies', status: 'todo', assignedTo: '6677a1a11f95305cc857f004' },
      { title: 'Configure CI/CD automated test pipeline', desc: 'Setup GitHub Actions yaml scripts', status: 'todo', assignedTo: '6677a1a11f95305cc857f005' },
      { title: 'Documentation & Architecture Diagrams', desc: 'Write final README and design specs', status: 'todo', assignedTo: '6677a1a11f95305cc857f005' },
    ];

    for (const t of tasksData) {
      const task = new Task({
        title: t.title,
        description: t.desc,
        status: t.status,
        assignedTo: new mongoose.Types.ObjectId(t.assignedTo),
        team: teamId,
        assignment: assignmentId,
        createdAt: new Date('2026-06-13T10:00:00Z'),
        completedAt: t.status === 'done' ? new Date('2026-06-18T16:00:00Z') : undefined
      });
      await task.save();
    }
    console.log('Kanban Tasks seeded.');

    // 6. Seed VS Code Sessions
    const sessionsData = [
      // Alex Rivera - Authentic Manual Coder
      {
        student: '6677a1a11f95305cc857f002',
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
        student: '6677a1a11f95305cc857f002',
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
        student: '6677a1a11f95305cc857f003',
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
        student: '6677a1a11f95305cc857f003',
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
        student: '6677a1a11f95305cc857f004',
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
      // Emma Watson (Heavy Copy-Paste & 0 Typing)
      {
        student: '6677a1a11f95305cc857f005',
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
    ];

    for (const s of sessionsData) {
      const session = new VSCodeSession({
        student: new mongoose.Types.ObjectId(s.student),
        assignment: assignmentId,
        team: teamId,
        sessionStart: s.sessionStart,
        sessionEnd: s.sessionEnd,
        durationMinutes: s.durationMinutes,
        keystrokes: s.keystrokes,
        filesEdited: s.filesEdited,
        filesCreated: s.filesCreated,
        filesDeleted: [],
        fileActivities: s.fileActivities,
        codingProvenance: s.codingProvenance,
        pasteCount: s.pasteCount,
        charactersPasted: s.charactersPasted,
        linesAdded: s.linesAdded,
        linesRemoved: s.linesRemoved,
        isOffline: s.isOffline
      });
      await session.save();
    }
    console.log('VS Code Telemetry Sessions seeded.');

    // 7. Seed Git Activities
    const gitData = [
      // Alex Rivera
      {
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
    ];

    for (const g of gitData) {
      const activity = new GitActivity({
        team: teamId,
        student: new mongoose.Types.ObjectId(g.student),
        gitUsername: g.gitUsername,
        commitHash: g.commitHash,
        commitMessage: g.commitMessage,
        commitDate: g.commitDate,
        linesAdded: g.linesAdded,
        linesRemoved: g.linesRemoved,
        filesChanged: g.filesChanged,
        activityType: g.activityType as any,
        prId: g.prId,
        prTitle: g.prTitle
      });
      await activity.save();
    }
    console.log('Git Activities seeded.');

    // 8. Run calculations to generate Analytics Reports in Mongoose
    console.log('Calculating Analytics Reports...');
    await calculateAssignmentAnalytics(assignmentId.toString());
    console.log('Analytics Reports calculated.');

    console.log('Database seeded successfully in MongoDB Cloud Atlas cluster.');
    mongoose.connection.close();
    process.exit(0);
  } catch (err: any) {
    console.error('Seeding Failed:', err);
    process.exit(1);
  }
};

seedDatabase();
