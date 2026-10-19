'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Activity, AlertTriangle, ShieldCheck, Terminal, Bot, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudentInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
}

export const StudentInspectModal: React.FC<StudentInspectModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  if (!report) return null;

  const metrics = report.metrics || {};
  const alerts = report.alerts || {};
  const scores = report.scores || {};
  const student = report.student || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student.name || 'Student Audit'}
      description={`Provenance Audit Log • ${student.email || ''}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Coding Provenance Classification */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-800 font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-slate-700" />
              Coding Provenance Classification
            </span>
            <span className="text-[11px] font-bold text-slate-900 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs font-mono">
              {metrics.primaryCodingStyle || 'Manual Typing'}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            <div style={{ width: `${metrics.manualPercent ?? 100}%` }} className="bg-[#6FAF9A] h-full" title="Manual" />
            <div style={{ width: `${metrics.aiPercent ?? 0}%` }} className="bg-[#8B5CF6] h-full" title="AI-Assisted" />
            <div style={{ width: `${metrics.pastePercent ?? 0}%` }} className="bg-rose-500 h-full" title="Pasted" />
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center text-xs pt-1 font-mono">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Manual Typing</span>
              <span className="font-extrabold text-slate-900 text-sm">{metrics.manualPercent ?? 100}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 block text-[10px]">AI Assistance</span>
              <span className="font-extrabold text-purple-700 text-sm">{metrics.aiPercent ?? 0}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Clipboard Pasting</span>
              <span className="font-extrabold text-rose-600 text-sm">{metrics.pastePercent ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Alert Box */}
        {alerts.alertMessage && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
            alerts.isFreeRider || alerts.hasCopyPasteAnomaly 
              ? 'bg-rose-50 border-rose-200 text-rose-800' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Integrity & Telemetry Diagnostic:</span>
              <span>{alerts.alertMessage}</span>
            </div>
          </div>
        )}

        {/* Multi-factor Score Breakdown */}
        <div className="grid grid-cols-4 gap-3 text-center font-mono">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] text-slate-400 block">Git</span>
            <span className="text-base font-bold text-slate-900">{scores.git ?? 0}%</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] text-slate-400 block">VS Code</span>
            <span className="text-base font-bold text-slate-900">{scores.vscode ?? 0}%</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] text-slate-400 block">Task</span>
            <span className="text-base font-bold text-slate-900">{scores.task ?? 0}%</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] text-slate-400 block">Collab</span>
            <span className="text-base font-bold text-slate-900">{scores.collab ?? 0}%</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} variant="primary">
            Close Audit View
          </Button>
        </div>
      </div>
    </Modal>
  );
};
