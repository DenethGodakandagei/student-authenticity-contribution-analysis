export type AssignmentType = 'individual' | 'team';

export interface AssignmentWeights {
  gitWeight: number;
  vscodeWeight: number;
  taskWeight: number;
  collabWeight: number;
}

export interface Assignment {
  _id: string;
  id?: string;
  title: string;
  description: string;
  deadline: string;
  type: AssignmentType;
  weights?: AssignmentWeights;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAssignmentInput {
  title: string;
  description: string;
  deadline: string;
  type: AssignmentType;
  gitWeight: number;
  vscodeWeight: number;
  taskWeight: number;
  collabWeight: number;
}
