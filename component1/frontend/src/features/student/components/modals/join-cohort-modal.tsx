'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Users, Search, Plus } from 'lucide-react';

interface JoinCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  setInviteCode: (v: string) => void;
  searchedAssignment: any;
  searchedTeams: any[];
  teamFlow: 'none' | 'create' | 'join';
  setTeamFlow: (v: 'none' | 'create' | 'join') => void;
  teamName: string;
  setTeamName: (v: string) => void;
  gitUsername: string;
  setGitUsername: (v: string) => void;
  teamInviteCode: string;
  setTeamInviteCode: (v: string) => void;
  repoUrl: string;
  setRepoUrl: (v: string) => void;
  onSearchInvite: (e: React.FormEvent) => void;
  onCreateTeam: (e: React.FormEvent) => void;
  onJoinTeam: (e: React.FormEvent, teamId?: string) => void;
}

export const JoinCohortModal: React.FC<JoinCohortModalProps> = ({
  isOpen,
  onClose,
  inviteCode,
  setInviteCode,
  searchedAssignment,
  searchedTeams,
  teamFlow,
  setTeamFlow,
  teamName,
  setTeamName,
  gitUsername,
  setGitUsername,
  teamInviteCode,
  setTeamInviteCode,
  repoUrl,
  setRepoUrl,
  onSearchInvite,
  onCreateTeam,
  onJoinTeam
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Assignment Cohort"
      description="Enter the cohort invite code provided by your lecturer."
      maxWidth="lg"
    >
      <div className="space-y-5">
        <form onSubmit={onSearchInvite} className="flex gap-2.5">
          <input
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Cohort Invite Code (e.g. INV-100)"
            className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
          />
          <Button type="submit" variant="primary" size="md">
            <Search className="w-4 h-4 mr-1" />
            Lookup
          </Button>
        </form>

        {searchedAssignment && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-left">
            <div>
              <span className="text-[10px] uppercase font-mono text-emerald-700 font-bold block">
                Found Assignment
              </span>
              <h4 className="text-sm font-bold text-slate-900">{searchedAssignment.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{searchedAssignment.description}</p>
            </div>

            {teamFlow === 'none' && (
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setTeamFlow('create')}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create New Team
                </Button>
                <Button
                  type="button"
                  onClick={() => setTeamFlow('join')}
                  variant="outline"
                  size="sm"
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Join Existing Team
                </Button>
              </div>
            )}

            {teamFlow === 'create' && (
              <form onSubmit={onCreateTeam} className="space-y-3 pt-2 border-t border-slate-200">
                <h5 className="text-xs font-bold text-slate-900">Create Team for Assignment</h5>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team Name (e.g. Team Alpha)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={gitUsername}
                  onChange={(e) => setGitUsername(e.target.value)}
                  placeholder="Your GitHub Username"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="GitHub Repository URL (Optional)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setTeamFlow('none')}>
                    Back
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Confirm & Register Team
                  </Button>
                </div>
              </form>
            )}

            {teamFlow === 'join' && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h5 className="text-xs font-bold text-slate-900">Select Team or Enter Invite Code</h5>
                <form onSubmit={onJoinTeam} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={teamInviteCode}
                    onChange={(e) => setTeamInviteCode(e.target.value)}
                    placeholder="Team Invite Code (e.g. TM-101)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={gitUsername}
                    onChange={(e) => setGitUsername(e.target.value)}
                    placeholder="Your GitHub Username"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTeamFlow('none')}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Join Team
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
