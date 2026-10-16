'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface CreateGeneralTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  setTeamName: (v: string) => void;
  gitUsername: string;
  setGitUsername: (v: string) => void;
  studentsList: any[];
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  onCreateTeam: (e: React.FormEvent) => void;
}

export const CreateGeneralTeamModal: React.FC<CreateGeneralTeamModalProps> = ({
  isOpen,
  onClose,
  teamName,
  setTeamName,
  gitUsername,
  setGitUsername,
  studentsList,
  selectedMembers,
  setSelectedMembers,
  onCreateTeam
}) => {
  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form General Team"
      description="Create a team and pick teammates from the student roster."
      maxWidth="lg"
    >
      <form onSubmit={onCreateTeam} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name</label>
          <input
            type="text"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Distributed Core Team"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Your GitHub Username</label>
          <input
            type="text"
            required
            value={gitUsername}
            onChange={(e) => setGitUsername(e.target.value)}
            placeholder="e.g. octocat"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Initial Teammates ({selectedMembers.length} selected)
          </label>
          <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5">
            {studentsList.map((s) => (
              <label
                key={s.id || s.email}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white text-xs cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(s.id)}
                  onChange={() => toggleMember(s.id)}
                  className="rounded border-slate-300 text-slate-900"
                />
                <span className="font-medium text-slate-900">{s.name}</span>
                <span className="text-[11px] text-slate-400 font-mono">({s.email})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Team
          </Button>
        </div>
      </form>
    </Modal>
  );
};
