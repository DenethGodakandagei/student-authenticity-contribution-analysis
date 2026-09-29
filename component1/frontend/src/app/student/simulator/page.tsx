'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '../../../services/api';
import { 
  Terminal, ShieldCheck, Wifi, WifiOff, FileCode, Play, Square,
  RotateCcw, Send, File, ChevronRight, Activity, Keyboard, RefreshCw, Undo, FolderOpen, Info,
  Code2, Sparkles, Clipboard, CheckCircle2, AlertTriangle, Layers, Zap
} from 'lucide-react';
import Link from 'next/link';

interface VirtualFile {
  name: string;
  content: string;
  originalLines: number;
}

interface SimFileActivity {
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
}

export default function VSCodeSimulator() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [assignments, setAssignments] = useState<any[]>([]);

  // Simulator configurations
  const [isCoding, setIsCoding] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Editor files structure
  const [files, setFiles] = useState<Record<string, VirtualFile>>({
    'src/auth/jwt.ts': { 
      name: 'src/auth/jwt.ts', 
      content: 'import jwt from "jsonwebtoken";\n\nexport function verifyToken(token: string) {\n  return jwt.verify(token, process.env.SECRET || "dev");\n}\n',
      originalLines: 5
    },
    'src/services/api.ts': { 
      name: 'src/services/api.ts', 
      content: 'export class ApiClient {\n  static async fetchTelemetry() {\n    return fetch("/api/vscode/sync");\n  }\n}\n',
      originalLines: 5
    },
    'components/Dashboard.tsx': { 
      name: 'components/Dashboard.tsx', 
      content: 'import React from "react";\n\nexport const Dashboard = () => {\n  return <div className="p-4">Workspace Telemetry</div>;\n};\n',
      originalLines: 5
    }
  });
  const [selectedFile, setSelectedFile] = useState<string>('src/auth/jwt.ts');
  const [newFileName, setNewFileName] = useState('');
  
  // Live session metrics & Provenance
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [keystrokes, setKeystrokes] = useState(0);
  const [linesAdded, setLinesAdded] = useState(0);
  const [linesRemoved, setLinesRemoved] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [charactersPasted, setCharactersPasted] = useState(0);
  const [aiCharsCount, setAiCharsCount] = useState(0);
  const [aiEventsCount, setAiEventsCount] = useState(0);
  const [editedFilesList, setEditedFilesList] = useState<Set<string>>(new Set());
  const [createdFilesList, setCreatedFilesList] = useState<Set<string>>(new Set());
  const [fileActivities, setFileActivities] = useState<Record<string, SimFileActivity>>({});
  
  // Auto-typing animation ref
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoTyping, setIsAutoTyping] = useState(false);
  const [simulatorViewMode, setSimulatorViewMode] = useState<'editor' | 'inspector'>('editor');

  // Logger console logs
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [offlineCacheCount, setOfflineCacheCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'student') {
      router.push('/login?role=student');
      return;
    }
    setStudent(currentUser);
    
    // Load assignments
    api.assignments.getAll().then(res => {
      setAssignments(res.assignments);
      if (res.assignments.length > 0) {
        setSelectedAssignmentId(res.assignments[0]._id);
      }
    }).catch(err => {
      addLog('[ERROR] Failed to load assignments. Check backend connection.');
    });

    // Check localStorage for offline caches
    const cached = localStorage.getItem('offline_vscode_sessions');
    if (cached) {
      const parsed = JSON.parse(cached);
      setOfflineCacheCount(parsed.length);
      addLog(`[CACHE] Found ${parsed.length} cached offline sessions in local storage.`);
    }

    addLog('[SYSTEM] OffSync Telemetry & Provenance Simulator Initialized.');
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  const getOrCreateFileActivity = (fp: string, action: 'created' | 'edited' | 'deleted' = 'edited'): SimFileActivity => {
    if (fileActivities[fp]) return fileActivities[fp];
    return {
      filePath: fp,
      action,
      manualChars: 0,
      pasteChars: 0,
      aiChars: 0,
      manualKeystrokes: 0,
      pasteEvents: 0,
      aiEvents: 0,
      typingProvenance: 'manual',
      linesAdded: 0,
      linesRemoved: 0
    };
  };

  const handleStartCoding = () => {
    setIsCoding(true);
    setSessionStart(new Date());
    setKeystrokes(0);
    setLinesAdded(0);
    setLinesRemoved(0);
    setPasteCount(0);
    setCharactersPasted(0);
    setAiCharsCount(0);
    setAiEventsCount(0);
    setEditedFilesList(new Set());
    setCreatedFilesList(new Set());
    setFileActivities({});
    addLog('[SESSION] Began monitoring active keystrokes, clipboard telemetry, and AST insertions.');
  };

  // Compute live provenance distribution
  const totalChars = keystrokes + charactersPasted + aiCharsCount;
  const manualPct = totalChars > 0 ? Math.round((keystrokes / totalChars) * 100) : 100;
  const pastePct = totalChars > 0 ? Math.round((charactersPasted / totalChars) * 100) : 0;
  const aiPct = totalChars > 0 ? Math.max(0, 100 - manualPct - pastePct) : 0;

  let currentStyle = 'Authentic Manual Typing';
  if (pastePct > 50) currentStyle = 'Heavy Copy-Paste';
  else if (aiPct > 40) currentStyle = 'AI-Assisted Generation';
  else if (aiPct > 15) currentStyle = 'Balanced Copilot-Assisted';

  const handleStopCoding = () => {
    if (!sessionStart) return;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setIsCoding(false);
    setIsAutoTyping(false);
    
    const sessionEnd = new Date();
    const durationMin = Math.max(1, Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000));
    const activeFolderSet = new Set<string>();
    Array.from(editedFilesList).concat(Array.from(createdFilesList)).forEach(f => {
      const parts = f.split('/');
      if (parts.length > 1) {
        parts.pop();
        activeFolderSet.add(parts.join('/'));
      }
    });

    const fileActivityList = Object.values(fileActivities);

    const sessionPayload = {
      sessionStart: sessionStart.toISOString(),
      sessionEnd: sessionEnd.toISOString(),
      durationMinutes: durationMin,
      keystrokes,
      pasteCount,
      charactersPasted,
      aiChars: aiCharsCount,
      aiEvents: aiEventsCount,
      filesEdited: Array.from(editedFilesList),
      filesCreated: Array.from(createdFilesList),
      filesDeleted: [],
      foldersCreated: Array.from(activeFolderSet),
      foldersDeleted: [],
      activeFolders: Array.from(activeFolderSet),
      fileActivities: fileActivityList,
      codingProvenance: {
        manualPercent: manualPct,
        pastePercent: pastePct,
        aiPercent: aiPct,
        style: currentStyle
      },
      linesAdded,
      linesRemoved,
      isOffline: !isOnline
    };

    if (isOnline) {
      uploadSession(sessionPayload);
    } else {
      const cached = localStorage.getItem('offline_vscode_sessions');
      const list = cached ? JSON.parse(cached) : [];
      list.push(sessionPayload);
      localStorage.setItem('offline_vscode_sessions', JSON.stringify(list));
      setOfflineCacheCount(list.length);
      addLog(`[OFFLINE BUFFER] Buffered ${durationMin} min telemetry session (${fileActivityList.length} files, ${currentStyle}) locally.`);
    }
  };

  const uploadSession = async (session: any) => {
    setSyncing(true);
    try {
      await api.vscode.sync({
        sessions: session,
        assignmentId: selectedAssignmentId
      });
      addLog(`[SYNC SUCCESS] Saved telemetry session successfully to database!`);
    } catch (err: any) {
      addLog(`[SYNC ERROR] Sync failed: ${err.message}. Buffering locally.`);
      const cached = localStorage.getItem('offline_vscode_sessions');
      const list = cached ? JSON.parse(cached) : [];
      list.push(session);
      localStorage.setItem('offline_vscode_sessions', JSON.stringify(list));
      setOfflineCacheCount(list.length);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCachedSessions = async () => {
    if (!isOnline) {
      addLog('[SYNC WARNING] Cannot sync cached telemetry: Network state is offline.');
      return;
    }

    const cached = localStorage.getItem('offline_vscode_sessions');
    if (!cached || JSON.parse(cached).length === 0) {
      addLog('[SYNC] No local cached sessions found to synchronize.');
      return;
    }

    const sessionsList = JSON.parse(cached);
    setSyncing(true);
    addLog(`[SYNC] Reconciling ${sessionsList.length} cached offline sessions to server...`);
    
    try {
      await api.vscode.sync({
        sessions: sessionsList,
        assignmentId: selectedAssignmentId
      });
      localStorage.removeItem('offline_vscode_sessions');
      setOfflineCacheCount(0);
      addLog(`[SYNC SUCCESS] Reconciled and attested ${sessionsList.length} cached offline sessions successfully!`);
    } catch (err: any) {
      addLog(`[SYNC ERROR] Bulk reconciliation failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // --- SIMULATION ACTION 1: Live Manual Keystroke Typing ---
  const handleSimulateManualTyping = () => {
    if (!isCoding) handleStartCoding();
    setIsAutoTyping(true);

    const snippet = `\n// --- Manual Function Implementation ---\nexport async function computeHash(data: string): Promise<string> {\n  const buffer = new TextEncoder().encode(data);\n  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);\n  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');\n}\n`;

    let charIndex = 0;
    const fileKey = selectedFile;

    addLog(`[PROVENANCE] Simulating human character-by-character typing in "${fileKey}"...`);

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      if (charIndex >= snippet.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsAutoTyping(false);
        addLog(`[PROVENANCE] Finished manual typing simulation in "${fileKey}".`);
        return;
      }

      const nextChar = snippet[charIndex];
      charIndex++;

      setKeystrokes(prev => prev + 1);
      setFiles(prev => {
        const curr = prev[fileKey];
        return {
          ...prev,
          [fileKey]: {
            ...curr,
            content: curr.content + nextChar
          }
        };
      });

      if (nextChar === '\n') {
        setLinesAdded(prev => prev + 1);
      }

      setEditedFilesList(prev => new Set(prev).add(fileKey));

      setFileActivities(prev => {
        const fa = prev[fileKey] || getOrCreateFileActivity(fileKey, 'edited');
        const updatedManual = fa.manualChars + 1;
        const updatedKeys = fa.manualKeystrokes + 1;
        const total = updatedManual + fa.pasteChars + fa.aiChars;
        const lines = nextChar === '\n' ? fa.linesAdded + 1 : fa.linesAdded;
        return {
          ...prev,
          [fileKey]: {
            ...fa,
            manualChars: updatedManual,
            manualKeystrokes: updatedKeys,
            linesAdded: lines,
            typingProvenance: fa.pasteChars / total > 0.45 ? 'copy_paste' : (fa.aiChars / total > 0.3 ? 'ai_assisted' : 'manual')
          }
        };
      });
    }, 45); // 45ms typing interval
  };

  // --- SIMULATION ACTION 2: AI Code Generation / Copilot Completion ---
  const handleSimulateAiGeneration = () => {
    if (!isCoding) handleStartCoding();

    const aiSnippet = `\n// [AI-Copilot Generated: WebSocket Multi-Room Handler]\nexport class RoomGateway {\n  private rooms = new Map<string, Set<WebSocket>>();\n  broadcast(room: string, msg: string) {\n    this.rooms.get(room)?.forEach(s => s.send(msg));\n  }\n}\n`;

    const fileKey = selectedFile;
    const addedLines = aiSnippet.split('\n').length - 1;
    const addedChars = aiSnippet.length;

    setAiCharsCount(prev => prev + addedChars);
    setAiEventsCount(prev => prev + 1);
    setLinesAdded(prev => prev + addedLines);
    setEditedFilesList(prev => new Set(prev).add(fileKey));

    setFiles(prev => ({
      ...prev,
      [fileKey]: {
        ...prev[fileKey],
        content: prev[fileKey].content + aiSnippet
      }
    }));

    setFileActivities(prev => {
      const fa = prev[fileKey] || getOrCreateFileActivity(fileKey, 'edited');
      const updatedAiChars = fa.aiChars + addedChars;
      const updatedAiEvents = fa.aiEvents + 1;
      const total = fa.manualChars + fa.pasteChars + updatedAiChars;
      return {
        ...prev,
        [fileKey]: {
          ...fa,
          aiChars: updatedAiChars,
          aiEvents: updatedAiEvents,
          linesAdded: fa.linesAdded + addedLines,
          typingProvenance: updatedAiChars / total > 0.3 ? 'ai_assisted' : 'mixed'
        }
      };
    });

    addLog(`[AI DETECTED] Structured AI inline suggestion accepted (+${addedChars} chars, +${addedLines} LOC) in "${fileKey}".`);
  };

  // --- SIMULATION ACTION 3: Bulk Clipboard Copy-Paste ---
  const handleSimulateCopyPaste = () => {
    if (!isCoding) handleStartCoding();

    const pasteSnippet = `\n// --- BULK COPIED UTILS DUMP (950 chars) ---\nfunction matrixMultiply(a: number[][], b: number[][]): number[][] {\n  const result: number[][] = [];\n  for (let i = 0; i < a.length; i++) {\n    result[i] = [];\n    for (let j = 0; j < b[0].length; j++) {\n      let sum = 0;\n      for (let k = 0; k < a[0].length; k++) {\n        sum += a[i][k] * b[k][j];\n      }\n      result[i][j] = sum;\n    }\n  }\n  return result;\n}\n`;

    const fileKey = selectedFile;
    const addedLines = pasteSnippet.split('\n').length - 1;
    const addedChars = pasteSnippet.length;

    setPasteCount(prev => prev + 1);
    setCharactersPasted(prev => prev + addedChars);
    setLinesAdded(prev => prev + addedLines);
    setEditedFilesList(prev => new Set(prev).add(fileKey));

    setFiles(prev => ({
      ...prev,
      [fileKey]: {
        ...prev[fileKey],
        content: prev[fileKey].content + pasteSnippet
      }
    }));

    setFileActivities(prev => {
      const fa = prev[fileKey] || getOrCreateFileActivity(fileKey, 'edited');
      const updatedPasteChars = fa.pasteChars + addedChars;
      const updatedPasteEvents = fa.pasteEvents + 1;
      const total = fa.manualChars + updatedPasteChars + fa.aiChars;
      return {
        ...prev,
        [fileKey]: {
          ...fa,
          pasteChars: updatedPasteChars,
          pasteEvents: updatedPasteEvents,
          linesAdded: fa.linesAdded + addedLines,
          typingProvenance: updatedPasteChars / total > 0.45 ? 'copy_paste' : 'mixed'
        }
      };
    });

    addLog(`[PASTE DETECTED] Bulk paste anomaly (+${addedChars} chars, +${addedLines} LOC) inserted in "${fileKey}".`);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isCoding) {
      addLog('[WARNING] Start coding session to begin tracking keystrokes and lines.');
      return;
    }

    const newContent = e.target.value;
    const fileKey = selectedFile;
    const originalFile = files[fileKey];

    setKeystrokes(prev => prev + 1);

    const originalLines = originalFile.originalLines;
    const currentLines = newContent.split('\n').length;
    
    if (currentLines > originalLines) {
      setLinesAdded(currentLines - originalLines);
      setLinesRemoved(0);
    } else if (currentLines < originalLines) {
      setLinesRemoved(originalLines - currentLines);
      setLinesAdded(0);
    }

    setEditedFilesList(prev => new Set(prev).add(fileKey));

    setFileActivities(prev => {
      const fa = prev[fileKey] || getOrCreateFileActivity(fileKey, 'edited');
      return {
        ...prev,
        [fileKey]: {
          ...fa,
          manualChars: fa.manualChars + 1,
          manualKeystrokes: fa.manualKeystrokes + 1
        }
      };
    });

    setFiles(prev => ({
      ...prev,
      [fileKey]: {
        ...prev[fileKey],
        content: newContent
      }
    }));
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName || files[newFileName]) return;

    setFiles(prev => ({
      ...prev,
      [newFileName]: {
        name: newFileName,
        content: `// Created file: ${newFileName}\n\n`,
        originalLines: 3
      }
    }));

    if (isCoding) {
      setCreatedFilesList(prev => new Set(prev).add(newFileName));
      setFileActivities(prev => ({
        ...prev,
        [newFileName]: getOrCreateFileActivity(newFileName, 'created')
      }));
      addLog(`[WORKSPACE] Created file at location: ${newFileName}`);
    }

    setSelectedFile(newFileName);
    setNewFileName('');
  };

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col justify-between font-sans selection:bg-[#A3E635] selection:text-slate-950">
      
      {/* Header */}
      <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/student" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition text-xs font-medium">
            <Undo className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-950 text-[#A3E635] flex items-center justify-center shadow-xs">
              <Code2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">VS Code Telemetry Sensor Simulator</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              Diagnostic Mode
            </span>
          </div>
        </div>

        {/* Network Status Toggle */}
        <div className="flex items-center gap-3">
          {assignments.length > 0 && (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="bg-white border border-slate-200 rounded-full px-3.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#A3E635] shadow-xs cursor-pointer"
            >
              {assignments.map(a => (
                <option key={a._id} value={a._id}>{a.title}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setIsOnline(!isOnline);
              addLog(`[NETWORK] State switched to: ${!isOnline ? 'ONLINE' : 'OFFLINE'}`);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition border flex items-center gap-2 cursor-pointer shadow-xs ${
              isOnline 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse text-[#22C55E]" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                Offline (Local Buffer)
              </>
            )}
          </button>
        </div>
      </header>

      {/* Editor Mockup Area */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto w-full">
        
        {/* Left Column: File Tree & Session Controller */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between space-y-6 text-left shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <FolderOpen className="w-4 h-4 text-slate-800" />
                </div>
                <span>Tracked Files</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{Object.keys(files).length} files</span>
            </div>

            {/* Files List */}
            <div className="space-y-1.5 font-mono text-xs">
              {Object.keys(files).map(key => {
                const fa = fileActivities[key];
                const isActive = selectedFile === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedFile(key)}
                    className={`w-full text-left px-3 py-2.5 rounded-2xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#121417] text-white shadow-xs font-medium' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate max-w-[160px]">
                      <File className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#A3E635]' : 'text-slate-400'}`} />
                      <span className="truncate">{key}</span>
                    </div>
                    {fa && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : fa.typingProvenance === 'manual' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            fa.typingProvenance === 'ai_assisted' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            fa.typingProvenance === 'copy_paste' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {fa.typingProvenance === 'manual' ? '✍️ Manual' : fa.typingProvenance === 'ai_assisted' ? '🤖 AI' : fa.typingProvenance === 'copy_paste' ? '📋 Paste' : '⚡ Mixed'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create file */}
            <form onSubmit={handleCreateFile} className="flex gap-2 pt-3 border-t border-slate-100">
              <input
                type="text"
                required
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="path/new-file.ts"
                className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#A3E635] focus:bg-white transition"
              />
              <button 
                type="submit" 
                className="w-8 h-8 rounded-xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold text-sm flex items-center justify-center transition shadow-xs cursor-pointer"
                title="Add Tracked File"
              >
                +
              </button>
            </form>
          </div>

          {/* Session Controller Panel */}
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-4 text-center">
            <span className="text-[10px] block font-bold uppercase text-slate-400 tracking-wider">
              Telemetry Daemon Controller
            </span>
            
            <div className="flex gap-3">
              {!isCoding ? (
                <button
                  onClick={handleStartCoding}
                  className="flex-1 py-2.5 rounded-2xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Logging
                </button>
              ) : (
                <button
                  onClick={handleStopCoding}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop & Buffer
                </button>
              )}
            </div>

            {/* Cache Sync panel */}
            <div className="pt-3 border-t border-slate-200 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Offline Cached:</span>
                <span className="text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                  {offlineCacheCount} sessions
                </span>
              </div>
              
              <button
                onClick={handleSyncCachedSessions}
                disabled={syncing || offlineCacheCount === 0}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Reconcile Offline Buffer
              </button>
            </div>
          </div>
        </div>

        {/* Center: Live Editor & Simulation Control Bar */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          
          {/* Provenance Live Gauge Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-900 font-semibold text-xs flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Live Coding Provenance
              </span>
              <span className="text-[11px] font-semibold text-slate-800 bg-[#A3E635]/20 border border-[#A3E635]/50 px-2.5 py-0.5 rounded-full">
                {currentStyle}
              </span>
            </div>

            {/* Multi-segment progress bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3 p-0.5 border border-slate-200/60">
              <div style={{ width: `${manualPct}%` }} className="bg-[#A3E635] h-full rounded-l-full transition-all" title={`Manual: ${manualPct}%`}></div>
              <div style={{ width: `${aiPct}%` }} className="bg-purple-500 h-full transition-all" title={`AI: ${aiPct}%`}></div>
              <div style={{ width: `${pastePct}%` }} className="bg-rose-500 h-full rounded-r-full transition-all" title={`Pasted: ${pastePct}%`}></div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                <span className="text-slate-500 block text-[10px]">Manual Typing</span>
                <span className="font-bold text-slate-900">{manualPct}% <span className="text-[10px] font-normal text-slate-500">({keystrokes} chars)</span></span>
              </div>
              <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-2 text-center">
                <span className="text-purple-600 block text-[10px]">AI Copilot</span>
                <span className="font-bold text-purple-900">{aiPct}% <span className="text-[10px] font-normal text-purple-600">({aiCharsCount} chars)</span></span>
              </div>
              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2 text-center">
                <span className="text-rose-600 block text-[10px]">Bulk Pasted</span>
                <span className="font-bold text-rose-900">{pastePct}% <span className="text-[10px] font-normal text-rose-600">({charactersPasted} chars)</span></span>
              </div>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-grow bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col justify-between shadow-xs">
            
            {/* Top Editor Bar & Quick Simulation Actions */}
            <div className="pb-3 border-b border-slate-100 mb-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* macOS traffic light window dots */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]"></span>
                  </div>
                  <span className="text-slate-900 font-mono font-semibold text-xs">{selectedFile}</span>
                  
                  {/* View Mode Switcher */}
                  <div className="flex bg-slate-100 p-0.5 rounded-full text-[11px] border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setSimulatorViewMode('editor')}
                      className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                        simulatorViewMode === 'editor' 
                          ? 'bg-white text-slate-950 shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Live Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatorViewMode('inspector')}
                      className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                        simulatorViewMode === 'inspector' 
                          ? 'bg-white text-slate-950 shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Line Inspector
                    </button>
                  </div>
                </div>

                {isCoding ? (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {isAutoTyping ? 'Simulating Typing...' : 'Telemetry Active'}
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-full text-[11px] font-medium">
                    Logging Paused
                  </span>
                )}
              </div>

              {/* Simulation Mode Buttons */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSimulateManualTyping}
                  disabled={isAutoTyping}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Keyboard className="w-3.5 h-3.5 text-slate-700" />
                  <span>✍️ Manual Typing</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateAiGeneration}
                  className="p-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>🤖 AI Copilot</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateCopyPaste}
                  className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                >
                  <Clipboard className="w-3.5 h-3.5 text-rose-600" />
                  <span>📋 Bulk Paste</span>
                </button>
              </div>
            </div>

            {simulatorViewMode === 'editor' ? (
              <div className="flex-grow rounded-2xl bg-[#0B101B] border border-slate-800 p-4 shadow-inner flex flex-col">
                <textarea
                  className="flex-grow w-full bg-transparent text-emerald-300 font-mono text-xs outline-none resize-none leading-relaxed tracking-wide placeholder-slate-600"
                  rows={17}
                  value={files[selectedFile]?.content}
                  onChange={handleEditorChange}
                  placeholder="// Type code here or use the simulation buttons above to generate typing, AI, or paste telemetry..."
                />
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto max-h-[380px] border border-slate-200 rounded-2xl bg-slate-50 font-mono">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                      <th className="py-2.5 px-3 text-right w-10 border-r border-slate-200">#</th>
                      <th className="py-2.5 px-3 text-center w-28 border-r border-slate-200">Status</th>
                      <th className="py-2.5 px-3 text-center w-24 border-r border-slate-200">Sync Mode</th>
                      <th className="py-2.5 px-3 text-center w-24 border-r border-slate-200">Timestamp</th>
                      <th className="py-2.5 px-4 text-left">Line Content</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {(files[selectedFile]?.content.split('\n') || []).map((line, i) => {
                      const isAi = line.includes('AI-Copilot') || line.includes('RoomGateway') || line.includes('broadcast');
                      const isPaste = line.includes('BULK COPIED') || line.includes('matrixMultiply') || line.length > 85;
                      const statusBadge = isPaste 
                        ? { label: '📋 Pasted', cls: 'bg-rose-100 text-rose-700 border-rose-200' }
                        : isAi 
                        ? { label: '🤖 AI Copilot', cls: 'bg-purple-100 text-purple-700 border-purple-200' }
                        : { label: '✍️ Typed', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
                      
                      const timeStr = new Date(Date.now() - (files[selectedFile]?.content.split('\n').length - i) * 12000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                      return (
                        <tr key={i} className="hover:bg-white transition bg-white/60">
                          <td className="text-right text-slate-400 px-3 py-1.5 select-none w-10 border-r border-slate-200 text-[10px] font-mono">
                            {i + 1}
                          </td>
                          <td className="px-2.5 py-1.5 select-none w-28 border-r border-slate-200 text-[9px] text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full font-sans font-semibold border ${statusBadge.cls}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 select-none w-24 border-r border-slate-200 text-[9px] text-center whitespace-nowrap">
                            {offlineCacheCount > 0 && i % 3 === 0 ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-sans font-semibold">
                                Offline
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-sans font-semibold">
                                Online
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 select-none w-24 border-r border-slate-200 text-[10px] text-slate-500 text-center font-mono whitespace-nowrap">
                            {timeStr}
                          </td>
                          <td className="px-4 py-1.5 text-slate-800 whitespace-pre overflow-x-auto font-mono text-[11px]">
                            {line || ' '}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Status bar */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-500 font-mono">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <Keyboard className="w-3.5 h-3.5 text-slate-600" /> Keystrokes: {keystrokes}
                </span>
                <span className="text-emerald-600 font-medium">+ Lines: {linesAdded}</span>
                <span className="text-rose-600 font-medium">- Lines: {linesRemoved}</span>
              </div>
              <div>
                <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-700 font-medium">
                  Modified Files: {editedFilesList.size}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Console Sync Logger */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between space-y-4 text-left shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-900">
              <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Terminal className="w-4 h-4 text-slate-800" />
              </div>
              <span>Telemetry Output</span>
            </div>
            <button 
              onClick={clearLogs} 
              className="text-[11px] text-slate-400 hover:text-slate-800 font-medium cursor-pointer transition px-2 py-0.5 rounded-lg hover:bg-slate-100"
            >
              Clear
            </button>
          </div>

          <div className="flex-grow bg-[#0B101B] rounded-2xl p-4 overflow-y-auto text-[10px] font-mono space-y-2 h-96 border border-slate-800 shadow-inner">
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, index) => (
                <div key={index} className={`leading-relaxed ${
                  log.includes('SUCCESS') ? 'text-[#A3E635]' :
                  log.includes('ERROR') ? 'text-rose-400' :
                  log.includes('OFFLINE') ? 'text-amber-400' :
                  log.includes('AI') ? 'text-purple-300' :
                  log.includes('PASTE') ? 'text-rose-400' :
                  log.includes('SESSION') ? 'text-sky-300' :
                  'text-slate-300'
                }`}>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-600 text-center py-20 font-sans text-xs">Console idle. Telemetry logs will output here in real-time.</div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs leading-relaxed text-slate-600 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Info className="w-4 h-4 text-slate-700" />
              <span>How To Test Provenance:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
              <li>Click <strong className="text-slate-900 font-medium">✍️ Manual Typing</strong> to generate authentic keystrokes.</li>
              <li>Click <strong className="text-slate-900 font-medium">🤖 AI Copilot</strong> or <strong className="text-slate-900 font-medium">📋 Bulk Paste</strong>.</li>
              <li>Observe the <strong className="text-slate-900 font-medium">Live Coding Provenance</strong> gauge shift in real-time.</li>
              <li>Click <strong className="text-slate-900 font-medium">Stop & Buffer</strong> and reconcile with database.</li>
            </ol>
          </div>
        </div>

      </main>
    </div>
  );
}

