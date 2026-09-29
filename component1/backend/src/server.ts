import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { authenticateToken } from './middleware/auth';
import { register, login, getCurrentUser, getAllStudents } from './controllers/auth';
import { createAssignment, getAssignments, getAssignmentById, getAssignmentByInviteCode } from './controllers/assignments';
import { createTeam, joinTeam, updateRepositoryUrl, getTeamByAssignment, createGeneralTeam, addAssignmentToTeam, getMyTeams } from './controllers/teams';
import { createTask, getTasksByTeam, updateTaskStatus, deleteTask } from './controllers/tasks';
import { syncVSCodeTelemetry } from './controllers/vscode';
import { validateRepository, syncRepositoryData, getRepositoryContents, getFileContent } from './controllers/github';
import { getAssignmentReports, getStudentReport, getTeamAnalytics, triggerManualEvaluation } from './controllers/analytics';
import { getHealth } from './controllers/health';
import { syncTelemetryBatch } from './controllers/telemetry';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allows Next.js frontend to communicate seamlessly
  credentials: true
}));
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Root check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Hybrid Student Contribution Analytics API',
    databaseMode: 'MongoDB Cloud Atlas'
  });
});

// --- API ROUTES ---

// 1. Authentication Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, getCurrentUser);
app.get('/api/users/students', authenticateToken, getAllStudents);

// 2. Assignment Routes
app.post('/api/assignments', authenticateToken, createAssignment);
app.get('/api/assignments', authenticateToken, getAssignments);
app.get('/api/assignments/:id', authenticateToken, getAssignmentById);
app.get('/api/assignments/code/:code', authenticateToken, getAssignmentByInviteCode);

// 3. Team Routes
app.post('/api/teams', authenticateToken, createTeam);
app.post('/api/teams/general', authenticateToken, createGeneralTeam);
app.post('/api/teams/:teamId/add-assignment', authenticateToken, addAssignmentToTeam);
app.get('/api/teams/my-teams', authenticateToken, getMyTeams);
app.post('/api/teams/join', authenticateToken, joinTeam);
app.put('/api/teams/repo', authenticateToken, updateRepositoryUrl);
app.get('/api/teams/assignment/:assignmentId', authenticateToken, getTeamByAssignment);

// 4. Kanban Task Routes
app.post('/api/tasks', authenticateToken, createTask);
app.get('/api/tasks/team/:teamId', authenticateToken, getTasksByTeam);
app.put('/api/tasks/:taskId', authenticateToken, updateTaskStatus);
app.delete('/api/tasks/:taskId', authenticateToken, deleteTask);

// 5. VS Code Telemetry Route
app.post('/api/vscode/sync', authenticateToken, syncVSCodeTelemetry);

// 5b. Telemetry Sync Engine Routes (Plan 4)
app.get('/api/health', getHealth);
app.post('/api/telemetry/sync', syncTelemetryBatch);

// 6. GitHub Integration Routes
app.post('/api/github/validate', authenticateToken, validateRepository);
app.post('/api/github/sync', authenticateToken, syncRepositoryData);
app.get('/api/github/contents', authenticateToken, getRepositoryContents);
app.get('/api/github/file', authenticateToken, getFileContent);

// 7. Analytics & Reports Routes
app.get('/api/analytics/assignment/:assignmentId', authenticateToken, getAssignmentReports);
app.get('/api/analytics/student/:assignmentId', authenticateToken, getStudentReport);
app.get('/api/analytics/team/:teamId', authenticateToken, getTeamAnalytics);
app.post('/api/analytics/recalculate', authenticateToken, triggerManualEvaluation);

import mongoose from 'mongoose';


// Start Database & Server
const startServer = async () => {
  let dbStatus = 'ONLINE (Cloud Atlas)';
  try {
    await connectDB();
    console.log('✅ Real Database Connected: All IDE & sensor telemetry will be persisted directly to MongoDB.');
  } catch (err: any) {
    console.error('\n❌ =======================================================');
    console.error(`  ERROR: MongoDB connection failed: ${err.message}`);
    console.error('  Please check network or MONGO_URI in backend/.env');
    console.error('=========================================================\n');
    dbStatus = 'FAILED';
  }

  app.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`  BACKEND SERVER RUNNING ON PORT: http://localhost:${PORT}`);
    console.log(`  Database Connection State: ${dbStatus}`);
    console.log(`===========================================================`);
  });
};

startServer().catch(err => {
  console.error('Fatal: Server startup failed:', err);
});
