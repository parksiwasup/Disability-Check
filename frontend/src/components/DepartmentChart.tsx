import React from 'react';
import { Activity, Building, FileCheck, Layers } from 'lucide-react';
import { StatsData } from '../types';

interface DepartmentChartProps {
  stats: StatsData | null;
}

export const DepartmentChart: React.FC<DepartmentChartProps> = ({ stats }) => {
  if (!stats) return null;

  const total = stats.total || 1;
  const depts = Object.entries(stats.departments || {});
  const diags = Object.entries(stats.diagnoses || {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Department Breakdown */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-400" />
            <span>สัดส่วนผู้ขอรับการประเมินแยกตามแผนกตรวจ</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{depts.length} แผนก</span>
        </div>

        <div className="space-y-3">
          {depts.map(([dept, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={dept} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{dept}</span>
                  <span className="text-slate-400 font-mono">{count} ราย ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Diagnosis Breakdown */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>กลุ่มรหัสการวินิจฉัยโรคหลัก (ICD-10)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{diags.length} รหัส</span>
        </div>

        <div className="space-y-3">
          {diags.map(([diag, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={diag} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300 font-mono font-semibold">{diag}</span>
                  <span className="text-slate-400 font-mono">{count} ราย ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
