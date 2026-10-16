'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface DirectoryTabProps {
  studentsList: any[];
  studentSearchQuery: string;
  setStudentSearchQuery: (v: string) => void;
}

export const DirectoryTab: React.FC<DirectoryTabProps> = ({
  studentsList,
  studentSearchQuery,
  setStudentSearchQuery
}) => {
  const filteredStudents = studentsList.filter(
    (s) =>
      s.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <div className="pb-4 border-b border-black/[0.06]">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
        <p className="text-xs text-slate-500 font-light mt-0.5">
          Search classmates registered in the contribution tracking platform.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={studentSearchQuery}
            onChange={(e) => setStudentSearchQuery(e.target.value)}
            placeholder="Search by student name or academic email address..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition"
          />
        </div>

        <div className="overflow-x-auto w-full pt-2">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Academic Email</th>
                <th className="py-3 px-4 text-right">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.id || s.email} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#A3E635]/25 text-[#2D6606] border border-[#A3E635]/30 text-xs font-bold flex items-center justify-center">
                        {s.name?.charAt(0) || 'S'}
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{s.email}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[10px] uppercase text-emerald-600 font-bold">
                      Active Student
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                    No student profiles match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
