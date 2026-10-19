'use client';

import React, { useState } from 'react';
import { Plus, GitBranch, ExternalLink, Edit2, Check, Loader2 } from 'lucide-react';

interface TeamsTabProps {
  myTeams: any[];
  student: any;
  onOpenGeneralTeamModal: () => void;
  linkInviteCodes: Record<string, string>;
  setLinkInviteCodes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLinkAssignment: (e: React.FormEvent, teamId: string) => void;
  onUpdateRepo?: (teamId: string, repositoryUrl: string) => Promise<boolean | void>;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({
  myTeams,
  student,
  onOpenGeneralTeamModal,
  linkInviteCodes,
  setLinkInviteCodes,
  onLinkAssignment,
  onUpdateRepo
}) => {
  const [editingRepoTeamId, setEditingRepoTeamId] = useState<string | null>(null);
  const [repoInputs, setRepoInputs] = useState<Record<string, string>>({});
  const [savingRepo, setSavingRepo] = useState<Record<string, boolean>>({});

  const handleRepoSubmit = async (e: React.FormEvent, teamId: string) => {
    e.preventDefault();
    const url = (repoInputs[teamId] ?? '').trim();
    if (!url) return;
    setSavingRepo((prev) => ({ ...prev, [teamId]: true }));
    try {
      if (onUpdateRepo) {
        await onUpdateRepo(teamId, url);
      }
      setEditingRepoTeamId(null);
    } catch {
      // error handled in parent
    } finally {
      setSavingRepo((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center pb-4 border-b border-black/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">My Teams</h1>
          <p className="text-xs text-slate-500 font-light mt-0.5">
            Create teams, invite classmates, and link your group assignments.
          </p>
        </div>
        <button
          onClick={onOpenGeneralTeamModal}
          className="px-4 py-2 rounded-xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Team
        </button>
      </div>

      {myTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myTeams.map((t: any) => {
            const isLeader =
              t.leader === student?.id || (student && t.leader?.toString() === student.id);
            const isEditingThisRepo = editingRepoTeamId === t._id;

            return (
              <div
                key={t._id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-medium border border-slate-200 px-2 py-0.5 rounded-md bg-slate-50 text-slate-800 block w-max mb-2">
                      {isLeader ? 'Leader' : 'Member'}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">{t.name}</h3>
                  </div>
                  <span className="text-xs font-mono bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
                    Invite Code: <strong className="text-slate-900">{t.inviteCode}</strong>
                  </span>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    Team Members
                  </span>
                  <div className="space-y-1.5">
                    {t.members?.map((m: any) => (
                      <div
                        key={m.student?._id || m.student}
                        className="text-xs text-slate-700 flex justify-between"
                      >
                        <span>{m.student?.name || 'Joining Student'}</span>
                        <span className="text-slate-400 font-mono text-[11px]">@{m.gitUsername}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Repository Section */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                      Repository
                    </span>
                    {!isEditingThisRepo && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRepoTeamId(t._id);
                          setRepoInputs((prev) => ({ ...prev, [t._id]: t.repositoryUrl || '' }));
                        }}
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
                      >
                        {t.repositoryUrl ? (
                          <>
                            <Edit2 className="w-3 h-3 text-slate-400" />
                            <span>Change</span>
                          </>
                        ) : (
                          <span className="text-[#275306] font-semibold hover:underline">+ Add Repo Link</span>
                        )}
                      </button>
                    )}
                  </div>

                  {isEditingThisRepo ? (
                    <form onSubmit={(e) => handleRepoSubmit(e, t._id)} className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <GitBranch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="url"
                            required
                            autoFocus
                            value={repoInputs[t._id] ?? t.repositoryUrl ?? ''}
                            onChange={(e) =>
                              setRepoInputs((prev) => ({ ...prev, [t._id]: e.target.value }))
                            }
                            placeholder="https://github.com/organization/repository"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={savingRepo[t._id]}
                          className="px-3.5 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                        >
                          {savingRepo[t._id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRepoTeamId(null)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition cursor-pointer shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Paste your GitHub repository link (e.g. https://github.com/owner/project).
                      </p>
                    </form>
                  ) : (
                    <div>
                      {t.repositoryUrl ? (
                        <a
                          href={t.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-slate-800 hover:text-slate-950 flex items-center gap-1.5 underline decoration-slate-300 hover:decoration-slate-900 truncate group"
                          title={t.repositoryUrl}
                        >
                          <GitBranch className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 shrink-0" />
                          <span className="truncate">{t.repositoryUrl}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 ml-0.5" />
                        </a>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            No repository linked yet.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRepoTeamId(t._id);
                              setRepoInputs((prev) => ({ ...prev, [t._id]: '' }));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-lime-50 text-lime-800 border border-lime-200/80 hover:bg-lime-100 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Link Repository</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {t.assignment && (
                  <div className="border-t border-slate-100 pt-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] uppercase font-mono text-[#2D6606] tracking-wider block">
                      Linked Assignment
                    </span>
                    <span className="text-xs font-medium text-slate-900 block mt-0.5">
                      {t.assignment.title || 'Linked Assignment'}
                    </span>
                    {t.assignment.invitationCode && (
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Invite Code: {t.assignment.invitationCode}
                      </span>
                    )}
                  </div>
                )}

                {isLeader && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
                      Link Assignment to Team
                    </span>
                    <form onSubmit={(e) => onLinkAssignment(e, t._id)} className="flex gap-2.5">
                      <input
                        type="text"
                        required
                        value={linkInviteCodes[t._id] || ''}
                        onChange={(e) =>
                          setLinkInviteCodes((prev) => ({ ...prev, [t._id]: e.target.value }))
                        }
                        placeholder="Assignment Invite Code (e.g. INV-123)"
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer"
                      >
                        Link
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 p-12 rounded-3xl text-center text-xs text-slate-500">
          You are not in any teams yet. Click &quot;Create New Team&quot; to get started.
        </div>
      )}
    </div>
  );
};
