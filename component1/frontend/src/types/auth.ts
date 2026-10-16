export type Role = 'student' | 'lecturer';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  githubUsername?: string;
  studentId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
