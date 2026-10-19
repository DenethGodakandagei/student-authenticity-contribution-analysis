'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AnomalyAlertsBannerProps {
  alerts: any[];
}

export const AnomalyAlertsBanner: React.FC<AnomalyAlertsBannerProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="p-5 rounded-3xl border border-rose-200 bg-rose-50/50 space-y-3 text-left">
      <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
        <span className="uppercase tracking-wide">
          Review Needed: Inactive or Low Contribution Alerts
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map((alert) => (
          <div
            key={alert._id}
            className="text-xs bg-white p-4 rounded-2xl border border-rose-200 flex justify-between items-center shadow-xs"
          >
            <div>
              <span className="font-bold text-slate-900 block text-sm">{alert.student?.name}</span>
              <span className="text-slate-500 text-xs block mt-0.5">{alert.alerts?.alertMessage}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Standing</span>
              <span className="text-sm font-bold text-rose-600 font-mono bg-rose-100 px-2.5 py-0.5 rounded-full">
                {alert.scores?.final}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
