export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  teamId?: string;
  assignee?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMember {
  studentId: {
    _id: string;
    id?: string;
    name: string;
    email: string;
    githubUsername?: string;
  };
  role?: string;
  gitUsername?: string;
  joinedAt?: string;
}

export interface Team {
  _id: string;
  id?: string;
  name: string;
  assignmentId: string;
  inviteCode: string;
  repoUrl?: string;
  members: TeamMember[];
  createdAt?: string;
  updatedAt?: string;
}
