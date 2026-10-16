'use client';

import React from 'react';
import { FileCode, Plus, FolderOpen } from 'lucide-react';

interface SimulatorSidebarProps {
  files: Record<string, any>;
  selectedFile: string;
  onSelectFile: (fileName: string) => void;
  newFileName: string;
  setNewFileName: (v: string) => void;
  onAddFile: (e: React.FormEvent) => void;
}

export const SimulatorSidebar: React.FC<SimulatorSidebarProps> = ({
  files,
  selectedFile,
  onSelectFile,
  newFileName,
  setNewFileName,
  onAddFile
}) => {
  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/60 p-4 flex flex-col justify-between shrink-0 text-left">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px] text-slate-400 font-bold">
            <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
            Virtual Workspace
          </span>
          <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded-full font-mono">
            {Object.keys(files).length} files
          </span>
        </div>

        {/* File List */}
        <div className="space-y-1">
          {Object.keys(files).map((fileName) => {
            const isSelected = selectedFile === fileName;
            return (
              <button
                key={fileName}
                onClick={() => onSelectFile(fileName)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-[#A3E635]' : 'text-slate-400'}`} />
                <span className="truncate">{fileName}</span>
              </button>
            );
          })}
        </div>

        {/* Create new file */}
        <form onSubmit={onAddFile} className="pt-2 border-t border-slate-200/60">
          <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1 font-bold">
            Create Virtual File
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. utils/jwt.ts"
              className="flex-grow bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 font-mono"
            />
            <button
              type="submit"
              className="p-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
};
