const BASE_URL = 'http://localhost:5000/api';

const isClient = typeof window !== 'undefined';

export const getToken = (): string | null => {
  return isClient ? localStorage.getItem('token') : null;
};

export const setToken = (token: string): void => {
  if (isClient) localStorage.setItem('token', token);
};

export const logoutUser = (): void => {
  if (isClient) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const getUser = (): any => {
  if (!isClient) return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user: any): void => {
  if (isClient) localStorage.setItem('user', JSON.stringify(user));
};

async function request(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  
  // Set JSON content type if sending body
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Set JWT auth token
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth API
  auth: {
    register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me', { method: 'GET' })
  },

  // Assignments API
  assignments: {
    create: (data: any) => request('/assignments', { method: 'POST', body: JSON.stringify(data) }),
    getAll: () => request('/assignments', { method: 'GET' }),
    getById: (id: string) => request(`/assignments/${id}`, { method: 'GET' }),
    getByCode: (code: string) => request(`/assignments/code/${code}`, { method: 'GET' })
  },

  // Teams API
  teams: {
    create: (data: any) => request('/teams', { method: 'POST', body: JSON.stringify(data) }),
    createGeneral: (data: any) => request('/teams/general', { method: 'POST', body: JSON.stringify(data) }),
    addAssignment: (teamId: string, inviteCode: string) => request(`/teams/${teamId}/add-assignment`, { method: 'POST', body: JSON.stringify({ inviteCode }) }),
    getMyTeams: () => request('/teams/my-teams', { method: 'GET' }),
    join: (data: any) => request('/teams/join', { method: 'POST', body: JSON.stringify(data) }),
    updateRepo: (data: any) => request('/teams/repo', { method: 'PUT', body: JSON.stringify(data) }),
    getByAssignment: (assignmentId: string) => request(`/teams/assignment/${assignmentId}`, { method: 'GET' })
  },

  // Tasks API
  tasks: {
    create: (data: any) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    getByTeam: (teamId: string) => request(`/tasks/team/${teamId}`, { method: 'GET' }),
    updateStatus: (taskId: string, status: string) => request(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    delete: (taskId: string) => request(`/tasks/${taskId}`, { method: 'DELETE' })
  },

  // VS Code Telemetry API
  vscode: {
    sync: (data: any) => request('/vscode/sync', { method: 'POST', body: JSON.stringify(data) })
  },

  // GitHub Integration API
  github: {
    validate: (url: string) => request('/github/validate', { method: 'POST', body: JSON.stringify({ url }) }),
    sync: (data: any) => request('/github/sync', { method: 'POST', body: JSON.stringify(data) }),
    getContents: (teamId: string, path?: string) => request(`/github/contents?teamId=${teamId}&path=${encodeURIComponent(path || '')}`, { method: 'GET' }),
    getFile: (teamId: string, path: string) => request(`/github/file?teamId=${teamId}&path=${encodeURIComponent(path)}`, { method: 'GET' })
  },

  // Analytics API
  analytics: {
    getAssignmentReports: (assignmentId: string) => request(`/analytics/assignment/${assignmentId}`, { method: 'GET' }),
    getStudentReport: (assignmentId: string) => request(`/analytics/student/${assignmentId}`, { method: 'GET' }),
    getTeamAnalytics: (teamId: string) => request(`/analytics/team/${teamId}`, { method: 'GET' }),
    recalculate: (assignmentId: string) => request('/analytics/recalculate', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
    downloadCsv: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`${BASE_URL}/analytics/export/csv`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('CSV Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'telemetry_dataset.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  },

  // Users API
  users: {
    getStudents: () => request('/users/students', { method: 'GET' })
  }
};
