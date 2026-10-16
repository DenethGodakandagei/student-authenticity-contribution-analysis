'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '@/services/api';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignmentType, setAssignmentType] = useState('team');
  const [gitWeight, setGitWeight] = useState(40);
  const [vscodeWeight, setVscodeWeight] = useState(30);
  const [taskWeight, setTaskWeight] = useState(20);
  const [collabWeight, setCollabWeight] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalWeight = Number(gitWeight) + Number(vscodeWeight) + Number(taskWeight) + Number(collabWeight);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (totalWeight !== 100) {
      setError(`Weights must sum to 100%. Current sum: ${totalWeight}%`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.assignments.create({
        title,
        description,
        deadline,
        assignmentType,
        weights: {
          git: Number(gitWeight),
          vscode: Number(vscodeWeight),
          task: Number(taskWeight),
          collab: Number(collabWeight)
        }
      });
      setTitle('');
      setDescription('');
      setDeadline('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish assignment template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Assignment"
      description="Configure grading weights, timeline, and collaboration rules."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assignment Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Consensus Engine"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description & Guidelines</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline project objectives, team requirements, and submission instructions..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Submission Deadline</label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Structure</label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition cursor-pointer"
            >
              <option value="team">Team Project (Collaborative)</option>
              <option value="individual">Individual Submission</option>
            </select>
          </div>
        </div>

        {/* Weights Allocation Sliders */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lime-600" />
              Weight Allocation Matrix
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${totalWeight === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              Total: {totalWeight}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Git Commits</span>
              <input
                type="number"
                min="0"
                max="100"
                value={gitWeight}
                onChange={(e) => setGitWeight(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">VS Code Telemetry</span>
              <input
                type="number"
                min="0"
                max="100"
                value={vscodeWeight}
                onChange={(e) => setVscodeWeight(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Task Kanban</span>
              <input
                type="number"
                min="0"
                max="100"
                value={taskWeight}
                onChange={(e) => setTaskWeight(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Collaboration</span>
              <input
                type="number"
                min="0"
                max="100"
                value={collabWeight}
                onChange={(e) => setCollabWeight(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={totalWeight !== 100}>
            Publish Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
