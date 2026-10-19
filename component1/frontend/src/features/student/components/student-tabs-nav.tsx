'use client';

import React from 'react';
import { GitBranch, GitCommit, Clock, Kanban, Users, Search } from 'lucide-react';

export type StudentTabKey = 'repository' | 'commits' | 'timeline' | 'kanban' | 'teams' | 'directory';

interface StudentTabsNavProps {
  activeTab: StudentTabKey;
  onTabChange: (tab: StudentTabKey) => void;
  kanbanTaskCount?: number;
}

export const StudentTabsNav: React.FC<StudentTabsNavProps> = ({
  activeTab,
  onTabChange,
  kanbanTaskCount = 0
}) => {
  const tabs = [
    { key: 'repository' as StudentTabKey, label: 'Project Repository', icon: GitBranch },
    { key: 'commits' as StudentTabKey, label: 'Commits & Activity', icon: GitCommit },
    { key: 'timeline' as StudentTabKey, label: 'Activity Timeline', icon: Clock },
    { key: 'kanban' as StudentTabKey, label: 'Tasks & Kanban', icon: Kanban, badge: kanbanTaskCount },
    { key: 'teams' as StudentTabKey, label: 'My Teams', icon: Users },
    { key: 'directory' as StudentTabKey, label: 'Find Students', icon: Search }
  ];

  return (
    <div className="flex border-b border-[#6FAF9A]/15 overflow-x-auto gap-2 text-xs font-medium">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium whitespace-nowrap transition cursor-pointer ${
              isActive
                ? 'border-[#6FAF9A] text-[#0D1110] font-bold'
                : 'border-transparent text-[#576561] hover:text-[#0D1110] hover:border-[#6FAF9A]/30'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-[#6FAF9A]' : 'text-[#8fa099]'}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EFF8F3] text-[#0D1110] border border-[#6FAF9A]/25 font-mono">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
