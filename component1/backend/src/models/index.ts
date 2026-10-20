import mongoose, { Schema, Document } from 'mongoose';

// 1. User Interface & Model
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'lecturer' | 'student' | 'admin';
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['lecturer', 'student', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// 2. Assignment Interface & Model
export interface IAssignment extends Document {
  title: string;
  description: string;
  deadline: Date;
  assignmentType: 'individual' | 'team';
  weights: {
    git: number;     // e.g., 40
    vscode: number;  // e.g., 30
    task: number;    // e.g., 20
    collab: number;  // e.g., 10
  };
  invitationCode: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AssignmentSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  deadline: { type: Date, required: true },
  assignmentType: { type: String, enum: ['individual', 'team'], default: 'team' },
  weights: {
    git: { type: Number, default: 40 },
    vscode: { type: Number, default: 30 },
    task: { type: Number, default: 20 },
    collab: { type: Number, default: 10 }
  },
  invitationCode: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Assignment = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);

// 3. Team Interface & Model
export interface ITeam extends Document {
  name: string;
  assignment?: mongoose.Types.ObjectId;
  leader?: mongoose.Types.ObjectId;
  inviteCode: string;
  members: Array<{
    student: mongoose.Types.ObjectId;
    gitUsername: string;
  }>;
  repositoryUrl: string;
  createdAt: Date;
}

const TeamSchema: Schema = new Schema({
  name: { type: String, required: true },
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: false },
  leader: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  inviteCode: { type: String, required: true, unique: true },
  members: [{
    student: { type: Schema.Types.ObjectId, ref: 'User' },
    gitUsername: { type: String }
  }],
  repositoryUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);

// 4. Task Interface & Model (Kanban board)
export interface ITask extends Document {
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  assignedTo: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId;
  assignment: mongoose.Types.ObjectId;
  createdAt: Date;
  completedAt?: Date;
}

const TaskSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

// 5. VS Code Session Interface & Model (Telemetry)
export interface IFileActivity {
  filePath: string;
  action: 'created' | 'edited' | 'deleted';
  manualChars: number;
  pasteChars: number;
  aiChars: number;
  manualKeystrokes: number;
  pasteEvents: number;
  aiEvents: number;
  typingProvenance: 'manual' | 'ai_assisted' | 'copy_paste' | 'mixed';
  linesAdded: number;
  linesRemoved: number;
  lineRecords?: Array<{
    lineNumber: number;
    lineText?: string;
    provenance: 'manual' | 'copy_paste' | 'ai_assisted';
    isOffline?: boolean;
    timestamp?: string;
  }>;
  timestamp?: Date;
}

export interface ICodingProvenance {
  manualPercent: number;
  pastePercent: number;
  aiPercent: number;
  style: string;
}

export interface IVSCodeSession extends Document {
  student: mongoose.Types.ObjectId;
  assignment: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId;
  sessionStart: Date;
  sessionEnd: Date;
  durationMinutes: number;
  keystrokes: number;
  filesEdited: string[];
  filesCreated: string[];
  filesDeleted: string[];
  foldersCreated?: string[];
  foldersDeleted?: string[];
  activeFolders?: string[];
  fileActivities?: IFileActivity[];
  codingProvenance?: ICodingProvenance;
  linesAdded: number;
  linesRemoved: number;
  isOffline: boolean;
  pasteCount: number;
  charactersPasted: number;
  manualChars?: number;
  aiChars?: number;
  aiEvents?: number;
  createdAt: Date;
}

const LineRecordSchema = new Schema({
  lineNumber: { type: Number, required: true },
  lineText: { type: String, default: '' },
  provenance: { type: String, enum: ['manual', 'copy_paste', 'ai_assisted'], default: 'manual' },
  isOffline: { type: Boolean, default: false },
  timestamp: { type: String }
}, { _id: false });

const FileActivitySchema = new Schema({
  filePath: { type: String, required: true },
  action: { type: String, enum: ['created', 'edited', 'deleted'], default: 'edited' },
  manualChars: { type: Number, default: 0 },
  pasteChars: { type: Number, default: 0 },
  aiChars: { type: Number, default: 0 },
  manualKeystrokes: { type: Number, default: 0 },
  pasteEvents: { type: Number, default: 0 },
  aiEvents: { type: Number, default: 0 },
  typingProvenance: { type: String, enum: ['manual', 'ai_assisted', 'copy_paste', 'mixed'], default: 'manual' },
  linesAdded: { type: Number, default: 0 },
  linesRemoved: { type: Number, default: 0 },
  lineRecords: [LineRecordSchema],
  timestamp: { type: Date, default: Date.now }
}, { _id: false, strict: false });

const VSCodeSessionSchema: Schema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  sessionStart: { type: Date, required: true },
  sessionEnd: { type: Date, required: true },
  durationMinutes: { type: Number, required: true },
  keystrokes: { type: Number, default: 0 },
  filesEdited: [{ type: String }],
  filesCreated: [{ type: String }],
  filesDeleted: [{ type: String }],
  foldersCreated: [{ type: String }],
  foldersDeleted: [{ type: String }],
  activeFolders: [{ type: String }],
  fileActivities: [FileActivitySchema],
  codingProvenance: {
    manualPercent: { type: Number, default: 100 },
    pastePercent: { type: Number, default: 0 },
    aiPercent: { type: Number, default: 0 },
    style: { type: String, default: 'Manual Typing' }
  },
  linesAdded: { type: Number, default: 0 },
  linesRemoved: { type: Number, default: 0 },
  isOffline: { type: Boolean, default: false },
  pasteCount: { type: Number, default: 0 },
  charactersPasted: { type: Number, default: 0 },
  manualChars: { type: Number, default: 0 },
  aiChars: { type: Number, default: 0 },
  aiEvents: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const VSCodeSession = mongoose.models.VSCodeSession || mongoose.model<IVSCodeSession>('VSCodeSession', VSCodeSessionSchema);

// 6. Git Activity Interface & Model
export interface IGitActivity extends Document {
  team: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  gitUsername: string;
  commitHash: string;
  commitMessage: string;
  commitDate: Date;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  filesList?: string[];
  isAuthorized?: boolean;
  authorEmail?: string;
  activityType: 'commit' | 'pr_create' | 'pr_merge' | 'branch_create';
  prId?: number;
  prTitle?: string;
  createdAt: Date;
}

const GitActivitySchema: Schema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  gitUsername: { type: String, required: true },
  commitHash: { type: String, required: true },
  commitMessage: { type: String, required: true },
  commitDate: { type: Date, required: true },
  linesAdded: { type: Number, default: 0 },
  linesRemoved: { type: Number, default: 0 },
  filesChanged: { type: Number, default: 0 },
  filesList: [{ type: String }],
  isAuthorized: { type: Boolean, default: true },
  authorEmail: { type: String },
  activityType: { type: String, enum: ['commit', 'pr_create', 'pr_merge', 'branch_create'], default: 'commit' },
  prId: { type: Number },
  prTitle: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const GitActivity = mongoose.models.GitActivity || mongoose.model<IGitActivity>('GitActivity', GitActivitySchema);

// 7. Analytics Report Interface & Model
export interface IAnalyticsReport extends Document {
  assignment: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId;
  scores: {
    git: number;
    vscode: number;
    task: number;
    collab: number;
    final: number;
  };
  metrics: {
    totalCommits: number;
    totalPRs: number;
    codingHours: number;
    offlineHours: number;
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
    tasksCompleted: number;
    keystrokeRatio: number;
    pasteCount: number;
    charactersPasted: number;
    manualPercent?: number;
    pastePercent?: number;
    aiPercent?: number;
    primaryCodingStyle?: string;
    fileActivities?: IFileActivity[];
  };
  alerts: {
    isFreeRider: boolean;
    isInactive: boolean;
    hasCopyPasteAnomaly: boolean;
    hasAiAnomaly?: boolean;
    alertMessage: string;
  };
  updatedAt: Date;
}

const AnalyticsReportSchema: Schema = new Schema({
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  scores: {
    git: { type: Number, default: 0 },
    vscode: { type: Number, default: 0 },
    task: { type: Number, default: 0 },
    collab: { type: Number, default: 0 },
    final: { type: Number, default: 0 }
  },
  metrics: {
    totalCommits: { type: Number, default: 0 },
    totalPRs: { type: Number, default: 0 },
    codingHours: { type: Number, default: 0 },
    offlineHours: { type: Number, default: 0 },
    filesModified: { type: Number, default: 0 },
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    keystrokeRatio: { type: Number, default: 0 },
    pasteCount: { type: Number, default: 0 },
    charactersPasted: { type: Number, default: 0 },
    manualPercent: { type: Number, default: 100 },
    pastePercent: { type: Number, default: 0 },
    aiPercent: { type: Number, default: 0 },
    primaryCodingStyle: { type: String, default: 'Manual Typing' },
    fileActivities: [FileActivitySchema]
  },
  alerts: {
    isFreeRider: { type: Boolean, default: false },
    isInactive: { type: Boolean, default: false },
    hasCopyPasteAnomaly: { type: Boolean, default: false },
    hasAiAnomaly: { type: Boolean, default: false },
    alertMessage: { type: String, default: '' }
  },
  updatedAt: { type: Date, default: Date.now }
});

export const AnalyticsReport = mongoose.models.AnalyticsReport || mongoose.model<IAnalyticsReport>('AnalyticsReport', AnalyticsReportSchema);

// 8. Telemetry Event Interface & Model (Plan 4)
export interface ITelemetryEvent extends Document {
  event_uuid: string;
  session_id: string;
  student_id: string;
  task_id: string;
  repo_id: string;
  branch: string;
  commit_sha: string;
  event_type: string;
  category: string;
  file_path: string;
  timestamp: number;
  payload_json: string;
  sync_status: number;
  previous_hash: string;
  row_hash: string;
  created_at: string;
  syncedAt: Date;
}

const TelemetryEventSchema: Schema = new Schema({
  event_uuid: { type: String, required: true, unique: true, index: true },
  session_id: { type: String, required: true, index: true },
  student_id: { type: String, required: true, index: true },
  task_id: { type: String, default: '' },
  repo_id: { type: String, default: '' },
  branch: { type: String, default: '' },
  commit_sha: { type: String, default: '' },
  event_type: { type: String, required: true },
  category: { type: String, default: 'SOURCE_CODE_EDIT' },
  file_path: { type: String, default: '' },
  timestamp: { type: Number, required: true, index: true },
  payload_json: { type: String, default: '{}' },
  sync_status: { type: Number, default: 1 },
  previous_hash: { type: String, default: '' },
  row_hash: { type: String, default: '' },
  created_at: { type: String, default: () => new Date().toISOString() },
  syncedAt: { type: Date, default: Date.now }
});

export const TelemetryEvent = mongoose.models.TelemetryEvent || mongoose.model<ITelemetryEvent>('TelemetryEvent', TelemetryEventSchema);

