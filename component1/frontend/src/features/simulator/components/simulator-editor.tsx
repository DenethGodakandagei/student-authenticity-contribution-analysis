'use client';

import React from 'react';
import { Keyboard, Sparkles, Clipboard, RotateCcw } from 'lucide-react';

interface SimulatorEditorProps {
  selectedFile: string;
  fileContent: string;
  isCoding: boolean;
  isAutoTyping: boolean;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onAutoType: () => void;
  onSimulateAi: () => void;
  onSimulatePaste: () => void;
  onResetSession: () => void;
}

export const SimulatorEditor: React.FC<SimulatorEditorProps> = ({
  selectedFile,
  fileContent,
  isCoding,
  isAutoTyping,
  onContentChange,
  onPaste,
  onAutoType,
  onSimulateAi,
  onSimulatePaste,
  onResetSession
}) => {
  const lineCount = fileContent.split('\n').length;

  return (
    <div className="flex-grow flex flex-col min-w-0 bg-white">
      {/* Editor toolbar */}
      <div className="px-5 py-3 border-b border-slate-200/80 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-800">{selectedFile}</span>
          <span className="text-[11px] text-slate-400 font-mono">({lineCount} lines)</span>
        </div>

        {/* Quick simulator injection triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAutoType}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isAutoTyping
                ? 'bg-emerald-600 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAutoTyping ? 'Typing...' : 'Auto-Type Keystrokes'}</span>
          </button>

          <button
            type="button"
            onClick={onSimulateAi}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Trigger AI Completion</span>
          </button>

          <button
            type="button"
            onClick={onSimulatePaste}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Clipboard className="w-3.5 h-3.5 text-rose-600" />
            <span>Simulate Paste Dump</span>
          </button>

          <button
            type="button"
            onClick={onResetSession}
            title="Reset telemetry counters"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor area with fake line numbers and textarea */}
      <div className="flex-grow flex min-h-[380px] font-mono text-xs text-slate-900 bg-white">
        <div className="w-12 py-4 select-none text-right pr-3 text-slate-300 bg-slate-50/50 border-r border-slate-100 leading-6 font-mono">
          {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          value={fileContent}
          onChange={onContentChange}
          onPaste={onPaste}
          placeholder="// Type code here or use the injection triggers above..."
          className="flex-grow p-4 resize-none outline-none leading-6 font-mono text-[#0D1110] bg-transparent selection:bg-[#6FAF9A] selection:text-white"
        />
      </div>
    </div>
  );
};
