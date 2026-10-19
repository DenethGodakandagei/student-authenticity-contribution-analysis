'use client';

import React from 'react';
import { Circle, Activity, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface KanbanTabProps {
  tasks: any[];
  team: any;
  newTaskTitle: string;
  setNewTaskTitle: (v: string) => void;
  newTaskDesc: string;
  setNewTaskDesc: (v: string) => void;
  newTaskAssignee: string;
  setNewTaskAssignee: (v: string) => void;
  onAddTask: (e: React.FormEvent) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const KanbanTab: React.FC<KanbanTabProps> = ({
  tasks,
  team,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDesc,
  setNewTaskDesc,
  newTaskAssignee,
  setNewTaskAssignee,
  onAddTask,
  onUpdateStatus,
  onDeleteTask
}) => {
  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#2D6606] font-bold">
            Team Tasks & Kanban (20% of Grade)
          </h3>
          <p className="text-xs text-slate-500 font-light mt-1">
            Track tasks and share deliverables with teammates for fair collaboration marks.
          </p>
        </div>

        {/* Task Form */}
        <form
          onSubmit={onAddTask}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200/60"
        >
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-slate-500 font-mono">Task Title</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="E.g. Setup auth routes"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-slate-500 font-mono">Description</label>
            <input
              type="text"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Describe work targets"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-slate-500 font-mono">Assignee</label>
            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="">Assign to Me</option>
              {team?.members?.map((m: any) => (
                <option key={m.student?._id || m.student} value={m.student?._id || m.student}>
                  {m.student?.name || 'Student'} ({m.gitUsername || 'member'})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </form>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {/* 1. TODO */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-600 font-mono flex items-center gap-2 font-bold">
              <Circle className="w-3.5 h-3.5 text-slate-400" />
              To Do
            </h4>
            <div className="space-y-2.5">
              {tasks
                .filter((t) => t.status === 'todo')
                .map((task) => (
                  <div key={task._id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-2xs">
                    <h5 className="font-semibold text-xs text-slate-900">{task.title}</h5>
                    {task.description && (
                      <p className="text-[10px] text-slate-500 leading-normal">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] font-mono">
                      <span className="text-slate-400">@{task.assignedTo?.name || 'Unassigned'}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onUpdateStatus(task._id, 'inprogress')}
                          className="text-emerald-700 font-semibold hover:underline"
                        >
                          Start →
                        </button>
                        <button
                          onClick={() => onDeleteTask(task._id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 2. IN PROGRESS */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-amber-600 font-mono flex items-center gap-2 font-bold">
              <Activity className="w-3.5 h-3.5" />
              In Progress
            </h4>
            <div className="space-y-2.5">
              {tasks
                .filter((t) => t.status === 'inprogress')
                .map((task) => (
                  <div key={task._id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-2xs">
                    <h5 className="font-semibold text-xs text-slate-900">{task.title}</h5>
                    {task.description && (
                      <p className="text-[10px] text-slate-500 leading-normal">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] font-mono">
                      <span className="text-slate-400">@{task.assignedTo?.name || 'Unassigned'}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onUpdateStatus(task._id, 'done')}
                          className="text-emerald-600 font-semibold hover:underline"
                        >
                          Done ✓
                        </button>
                        <button
                          onClick={() => onDeleteTask(task._id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 3. DONE */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-emerald-600 font-mono flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Done
            </h4>
            <div className="space-y-2.5">
              {tasks
                .filter((t) => t.status === 'done')
                .map((task) => (
                  <div key={task._id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 opacity-85 shadow-2xs">
                    <h5 className="font-semibold text-xs text-slate-900 line-through">{task.title}</h5>
                    {task.description && (
                      <p className="text-[10px] text-slate-400 leading-normal">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] font-mono">
                      <span className="text-slate-400">@{task.assignedTo?.name || 'Unassigned'}</span>
                      <button
                        onClick={() => onDeleteTask(task._id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
