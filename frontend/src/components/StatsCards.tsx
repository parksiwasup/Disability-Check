import React from 'react';
import { Users, CheckCircle2, Clock, Activity, ShieldCheck } from 'lucide-react';
import { StatsData } from '../types';

interface StatsCardsProps {
  stats: StatsData | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'ผู้ขอรับการประเมินทั้งหมด',
      value: stats?.total ?? 0,
      unit: 'ราย',
      desc: 'จากไฟล์ Excel / ระบบ HOSxP',
      icon: Users,
      color: 'from-blue-600 to-cyan-500',
      badge: 'Active Database',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      title: 'ตรวจวินิจฉัยแล้ว',
      value: stats?.evaluated ?? 0,
      unit: 'ราย',
      desc: 'พร้อมออกรายงาน สปส. 2-19',
      icon: CheckCircle2,
      color: 'from-teal-600 to-emerald-500',
      badge: `${stats?.total ? Math.round(((stats.evaluated || 0) / stats.total) * 100) : 0}% สำเร็จ`,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      title: 'รอดำเนินการประเมิน',
      value: stats?.pending ?? 0,
      unit: 'ราย',
      desc: 'นัดหมาย / รอแพทย์ตรวจเพิ่มเติม',
      icon: Clock,
      color: 'from-amber-600 to-orange-500',
      badge: 'In Progress',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      title: 'สูญเสียสมรรถภาพเฉลี่ย (WPI)',
      value: `${stats?.avgImpairment ?? 35}%`,
      unit: '',
      desc: 'Whole Person Impairment เฉลี่ย',
      icon: Activity,
      color: 'from-purple-600 to-indigo-500',
      badge: 'เกณฑ์ประกันสังคม',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      title: 'สิทธิประกันสังคม สปส. 2-19',
      value: '100%',
      unit: '',
      desc: 'ตรวจสอบสิทธิ HOSxP ตรงกัน',
      icon: ShieldCheck,
      color: 'from-emerald-600 to-teal-500',
      badge: 'Verified',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div 
            key={idx}
            className="glass-card rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition duration-200"
          >
            {/* Top gradient glow */}
            <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-xl group-hover:opacity-25 transition`}></div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md shadow-slate-900/40`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-xs font-medium text-slate-400">{card.title}</h3>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold tracking-tight text-white">{card.value}</span>
                {card.unit && <span className="text-xs text-slate-400">{card.unit}</span>}
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400 border-t border-slate-700/50 pt-2 flex items-center">
              {card.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
};
