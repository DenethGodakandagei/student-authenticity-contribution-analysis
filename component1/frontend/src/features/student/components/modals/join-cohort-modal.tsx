'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Users, Search, Plus, User, Check } from 'lucide-react';

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
  onJoinIndividual?: (e: React.FormEvent) => void;
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
  onJoinTeam,
  onJoinIndividual
}) => {
  const isIndividual = searchedAssignment?.assignmentType === 'individual';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Assignment"
      description="Enter the assignment invite code provided by your lecturer."
      maxWidth="lg"
    >
      <div className="space-y-5">
        <form onSubmit={onSearchInvite} className="flex gap-2.5">
          <input
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Assignment Invite Code (e.g. INV-100)"
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
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase font-mono text-[#2d5849] font-bold block">
                  Found Assignment
                </span>
                <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  isIndividual
                    ? 'bg-[#EFF8F3] text-[#2d5849] border-[#6FAF9A]/30'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {isIndividual ? 'Individual Submission' : 'Team Project (Collaborative)'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{searchedAssignment.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{searchedAssignment.description}</p>
            </div>

            {isIndividual ? (
              /* Individual Submission Flow - Direct Join, no team creation */
              <form onSubmit={onJoinIndividual || onCreateTeam} className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#EFF8F3] border border-[#6FAF9A]/20">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#6FAF9A]/30 flex items-center justify-center text-[#6FAF9A] shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-[#2d5849] leading-snug">
                    <span className="font-bold text-[#0D1110] block">Individual Submission</span>
                    This is an individual assignment. You will submit and track your work independently without team members.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Your GitHub Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={gitUsername}
                    onChange={(e) => setGitUsername(e.target.value)}
                    placeholder="e.g. your-github-username"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    GitHub Repository URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/project-repo"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0D1110] hover:bg-[#1a2220] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5 text-[#6FAF9A]" />
                    Confirm & Start Assignment
                  </button>
                </div>
              </form>
            ) : (
              /* Collaborative Team Flow */
              <>
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
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Team Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Team Name (e.g. Team Alpha)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Your GitHub Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={gitUsername}
                    onChange={(e) => setGitUsername(e.target.value)}
                    placeholder="Your GitHub Username"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Team GitHub Repository URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/organization/repository"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
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
                {searchedTeams && searchedTeams.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">
                      Teams in this Assignment:
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {searchedTeams.map((t) => (
                        <div
                          key={t._id || t.inviteCode}
                          onClick={() => setTeamInviteCode(t.inviteCode)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                            teamInviteCode === t.inviteCode
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{t.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{t.inviteCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={onJoinTeam} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={teamInviteCode}
                    onChange={(e) => setTeamInviteCode(e.target.value)}
                    placeholder="Team Invite Code (e.g. TEAM-101)"
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
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
