export interface VirtualFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface SimFileActivity {
  path: string;
  keystrokes: number;
  pastes: number;
  charsPasted: number;
  aiChars: number;
  aiEvents: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface SimTelemetryEvent {
  id: string;
  timestamp: string;
  type: 'keystroke' | 'paste' | 'ai_completion' | 'file_save' | 'ast_change';
  filePath: string;
  details: Record<string, any>;
}
