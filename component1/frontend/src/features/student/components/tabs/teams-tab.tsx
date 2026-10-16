'use client';

import React from 'react';
import { Plus } from 'lucide-react';

interface TeamsTabProps {
  myTeams: any[];
  student: any;
  onOpenGeneralTeamModal: () => void;
  linkInviteCodes: Record<string, string>;
  setLinkInviteCodes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLinkAssignment: (e: React.FormEvent, teamId: string) => void;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({
  myTeams,
  student,
  onOpenGeneralTeamModal,
  linkInviteCodes,
  setLinkInviteCodes,
  onLinkAssignment
}) => {
  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center pb-4 border-b border-black/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Teams Manager</h1>
          <p className="text-xs text-slate-500 font-light mt-0.5">
            Form general teams, select members directly, and link cohort assignments.
          </p>
        </div>
        <button
          onClick={onOpenGeneralTeamModal}
          className="px-4 py-2 rounded-xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Form General Team
        </button>
      </div>

      {myTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myTeams.map((t: any) => {
            const isLeader =
              t.leader === student?.id || (student && t.leader?.toString() === student.id);
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
                    Team Roster
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

                <div className="space-y-1 border-t border-slate-100 pt-4">
                  <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    Repository
                  </span>
                  <span className="text-xs font-mono block text-slate-600 truncate">
                    {t.repositoryUrl || 'No repository linked yet.'}
                  </span>
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
          You are not a member of any teams yet. Click &quot;Form General Team&quot; to create one.
        </div>
      )}
    </div>
  );
};
