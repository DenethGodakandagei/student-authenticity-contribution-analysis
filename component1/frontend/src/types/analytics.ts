export interface StudentReport {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  authenticityScore: number;
  finalGrade?: number;
  gitScore?: number;
  vscodeScore?: number;
  taskScore?: number;
  collabScore?: number;
  totalKeystrokes?: number;
  totalPastes?: number;
  totalAiEvents?: number;
  typingSpeedWpm?: number;
  anomalyDetected?: boolean;
  flags?: string[];
  lastActive?: string;
}

export interface RadarDataPoint {
  subject: string;
  A: number;
  fullMark: number;
}

export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  averageAuthenticity: number;
  totalCommits: number;
  tasksCompleted: number;
  metrics: RadarDataPoint[];
  members: StudentReport[];
}
