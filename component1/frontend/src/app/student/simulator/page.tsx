'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/services/api';
import {
  Code2,
  Play,
  Square,
  Wifi,
  WifiOff,
  Send,
  RefreshCw,
  Terminal,
  ArrowLeft
} from 'lucide-react';
import {
  SimulatorSidebar,
  SimulatorEditor,
  SimulatorMetrics
} from '@/features/simulator';

interface VirtualFile {
  name: string;
  content: string;
  originalLines: number;
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

  // Editor files
  const [files, setFiles] = useState<Record<string, VirtualFile>>({
    'src/auth/jwt.ts': {
      name: 'src/auth/jwt.ts',
      content:
        'import jwt from "jsonwebtoken";\n\nexport function verifyToken(token: string) {\n  return jwt.verify(token, process.env.SECRET || "dev");\n}\n',
      originalLines: 5
    },
    'src/services/api.ts': {
      name: 'src/services/api.ts',
      content:
        'export class ApiClient {\n  static async fetchTelemetry() {\n    return fetch("/api/vscode/sync");\n  }\n}\n',
      originalLines: 5
    },
    'components/Dashboard.tsx': {
      name: 'components/Dashboard.tsx',
      content:
        'import React from "react";\n\nexport const Dashboard = () => {\n  return <div className="p-4">Workspace Telemetry</div>;\n};\n',
      originalLines: 5
    }
  });
  const [selectedFile, setSelectedFile] = useState<string>('src/auth/jwt.ts');
  const [newFileName, setNewFileName] = useState('');

  // Live metrics
  const [keystrokes, setKeystrokes] = useState(0);
  const [linesAdded, setLinesAdded] = useState(0);
  const [linesRemoved, setLinesRemoved] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [charactersPasted, setCharactersPasted] = useState(0);
  const [aiCharsCount, setAiCharsCount] = useState(0);
  const [aiEventsCount, setAiEventsCount] = useState(0);

  // Animation ref
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoTyping, setIsAutoTyping] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [offlineCacheCount, setOfflineCacheCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'student') {
      router.push('/login?role=student');
      return;
    }
    setStudent(currentUser);
    api.assignments
      .getAll()
      .then((data) => {
        setAssignments(data.assignments || []);
        if (data.assignments && data.assignments.length > 0) {
          setSelectedAssignmentId(data.assignments[0]._id);
        }
      })
      .catch((err) => console.error(err));
  }, [router]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const handleStartCoding = () => {
    setIsCoding(true);
    addLog('VS Code Telemetry Sensor activated for student session.');
  };

  const handleStopCoding = () => {
    setIsCoding(false);
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
      setIsAutoTyping(false);
    }
    addLog('Coding session paused.');
  };

  const handleAutoType = () => {
    if (isAutoTyping) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
      setIsAutoTyping(false);
      addLog('Auto-typing simulator stopped.');
      return;
    }

    if (!isCoding) handleStartCoding();
    setIsAutoTyping(true);

    const snippet = `\n// Human cadence typing simulation\nfunction authenticateUser(req: Request) {\n  const token = req.headers.get("authorization");\n  if (!token) throw new Error("Unauthorized");\n  return verifyToken(token);\n}\n`;
    let charIdx = 0;
    const fileKey = selectedFile;

    typingTimerRef.current = setInterval(() => {
      if (charIdx >= snippet.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setIsAutoTyping(false);
        addLog('Completed automated human typing snippet.');
        return;
      }

      const nextChar = snippet[charIdx];
      charIdx++;
      setKeystrokes((prev) => prev + 1);
      if (nextChar === '\n') setLinesAdded((prev) => prev + 1);

      setFiles((prev) => ({
        ...prev,
        [fileKey]: {
          ...prev[fileKey],
          content: prev[fileKey].content + nextChar
        }
      }));
    }, 45);
  };

  const handleSimulateAi = () => {
    if (!isCoding) handleStartCoding();
    const aiSnippet = `\n// [AI-Copilot Generated: WebSocket Room]\nexport class RoomGateway {\n  broadcast(room: string, msg: string) {}\n}\n`;
    const addedLines = aiSnippet.split('\n').length - 1;
    const addedChars = aiSnippet.length;

    setAiCharsCount((prev) => prev + addedChars);
    setAiEventsCount((prev) => prev + 1);
    setLinesAdded((prev) => prev + addedLines);
    setFiles((prev) => ({
      ...prev,
      [selectedFile]: {
        ...prev[selectedFile],
        content: prev[selectedFile].content + aiSnippet
      }
    }));
    addLog(`[AI DETECTED] Structured AI inline suggestion accepted (+${addedChars} chars).`);
  };

  const handleSimulatePaste = () => {
    if (!isCoding) handleStartCoding();
    const pasteSnippet = `\n// --- BULK COPIED UTILS DUMP ---\nfunction matrixMultiply(a: number[][], b: number[][]): number[][] {\n  return [];\n}\n`;
    const addedLines = pasteSnippet.split('\n').length - 1;
    const addedChars = pasteSnippet.length;

    setPasteCount((prev) => prev + 1);
    setCharactersPasted((prev) => prev + addedChars);
    setLinesAdded((prev) => prev + addedLines);
    setFiles((prev) => ({
      ...prev,
      [selectedFile]: {
        ...prev[selectedFile],
        content: prev[selectedFile].content + pasteSnippet
      }
    }));
    addLog(`[PASTE DETECTED] Bulk paste anomaly (+${addedChars} chars) inserted.`);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isCoding) {
      addLog('[WARNING] Start coding session to track changes.');
      return;
    }
    const val = e.target.value;
    setKeystrokes((prev) => prev + 1);
    setFiles((prev) => ({
      ...prev,
      [selectedFile]: {
        ...prev[selectedFile],
        content: val
      }
    }));
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const path = newFileName.trim();
    if (files[path]) return;
    setFiles((prev) => ({
      ...prev,
      [path]: { name: path, content: '// New file\n', originalLines: 1 }
    }));
    setSelectedFile(path);
    setNewFileName('');
    addLog(`Virtual file created: "${path}".`);
  };

  const handleResetSession = () => {
    setKeystrokes(0);
    setLinesAdded(0);
    setLinesRemoved(0);
    setPasteCount(0);
    setCharactersPasted(0);
    setAiCharsCount(0);
    setAiEventsCount(0);
    addLog('Telemetry session reset.');
  };

  const handleSyncToCloud = async () => {
    if (!selectedAssignmentId) return;
    setSyncing(true);
    try {
      if (!isOnline) {
        setOfflineCacheCount((prev) => prev + 1);
        addLog('[OFFLINE BUFFER] Internet unreachable. Telemetry sealed in local cache.');
      } else {
        await api.vscode.sync({
          assignmentId: selectedAssignmentId,
          keystrokes,
          linesAdded,
          linesRemoved,
          pasteCount,
          charactersPasted,
          aiEvents: aiEventsCount,
          aiCharacters: aiCharsCount
        });
        setOfflineCacheCount(0);
        addLog('[SYNC SUCCESS] Telemetry dispatched to backend and verified.');
      }
    } catch (err: any) {
      addLog(`[SYNC ERROR] ${err.message || 'Sync failed.'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col font-sans selection:bg-[#6FAF9A] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900">INCODE</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded-full border border-slate-200">
              VS Code Sensor Simulator
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {assignments.length > 0 && (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-mono"
            >
              {assignments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.title}
                </option>
              ))}
            </select>
          )}

          {/* Online / Offline switch */}
          <button
            type="button"
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition cursor-pointer border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isOnline ? 'Network Online' : 'Air-Gapped Offline'}</span>
          </button>

          {/* Session toggle */}
          {isCoding ? (
            <button
              onClick={handleStopCoding}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Pause Session</span>
            </button>
          ) : (
            <button
              onClick={handleStartCoding}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-[#6FAF9A]" />
              <span>Start Tracking</span>
            </button>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSyncToCloud}
            disabled={syncing}
            className="px-4 py-1.5 rounded-xl bg-[#0D1110] hover:bg-[#1a2220] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#6FAF9A]" />
            <span>{syncing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </header>

      {/* Main Simulator Workspace */}
      <main className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Editor Main Card */}
        <div className="flex-grow flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex-grow flex flex-col md:flex-row">
            <SimulatorSidebar
              files={files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              newFileName={newFileName}
              setNewFileName={setNewFileName}
              onAddFile={handleAddFile}
            />

            <SimulatorEditor
              selectedFile={selectedFile}
              fileContent={files[selectedFile]?.content || ''}
              isCoding={isCoding}
              isAutoTyping={isAutoTyping}
              onContentChange={handleContentChange}
              onAutoType={handleAutoType}
              onSimulateAi={handleSimulateAi}
              onSimulatePaste={handleSimulatePaste}
              onResetSession={handleResetSession}
            />
          </div>

          {/* Metrics bar */}
          <SimulatorMetrics
            keystrokes={keystrokes}
            pasteCount={pasteCount}
            charactersPasted={charactersPasted}
            aiCharsCount={aiCharsCount}
            aiEventsCount={aiEventsCount}
            linesAdded={linesAdded}
            linesRemoved={linesRemoved}
          />
        </div>

        {/* Live Audit Log Drawer */}
        <div className="w-full md:w-80 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between shrink-0 text-left">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                <Terminal className="w-4 h-4 text-slate-600" />
                Audit Console
              </span>
              {offlineCacheCount > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded-full font-bold">
                  {offlineCacheCount} buffered
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto font-mono text-[11px] text-slate-600">
              {consoleLogs.length > 0 ? (
                consoleLogs.map((log, i) => (
                  <div key={i} className="py-1 border-b border-slate-50 leading-relaxed">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-400 py-8 text-center text-xs">
                  Session audit log will appear here as you type or inject code.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Biometric proof stream is active.
          </div>
        </div>
      </main>
    </div>
  );
}
