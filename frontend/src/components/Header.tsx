import React from 'react';
import { 
  Building2, 
  FileText, 
  Users, 
  FileSpreadsheet, 
  Sliders, 
  Database, 
  Sparkles,
  RefreshCw,
  Type
} from 'lucide-react';
import { DbStatus } from '../types';

export type TabType = 'dashboard' | 'patients' | 'word-studio' | 'pdf-studio' | 'excel' | 'settings';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  dbStatus: DbStatus | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  dbStatus,
  onRefresh,
  isLoading
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Hospital Brand */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 p-0.5 shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  ระบบประเมินทุพพลภาพ & พิมพ์ สปส. 2-19
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Pro Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                โรงพยาบาลศูนย์การแพทย์เฉพาะทาง • กลุ่มงานเวชศาสตร์ฟื้นฟู & ประกันสังคม
              </p>
            </div>
          </div>

          {/* Database indicator & Refresh button */}
          <div className="hidden md:flex items-center space-x-3">
            <div 
              id="mysql-status-indicator"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                dbStatus?.mysqlConnected 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
              }`}
              title={dbStatus?.message || 'Database status'}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{dbStatus?.mysqlConnected ? 'MySQL Connected' : 'Local Data Mode'}</span>
              <span className={`w-2 h-2 rounded-full ${dbStatus?.mysqlConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            </div>

            <button
              id="refresh-data-btn"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/60 pt-1">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'dashboard'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ภาพรวมแดชบอร์ด</span>
          </button>

          <button
            id="tab-patients"
            onClick={() => setActiveTab('patients')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'patients'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ทะเบียนผู้ขอรับการประเมิน</span>
          </button>

          {/* New Word Format Studio Tab */}
          <button
            id="tab-word-studio"
            onClick={() => setActiveTab('word-studio')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'word-studio'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Type className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">เครื่องมือจัดฟอนต์ (Word Studio)</span>
          </button>

          <button
            id="tab-pdf-studio"
            onClick={() => setActiveTab('pdf-studio')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'pdf-studio'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>พรีวิวและดาวน์โหลด PDF</span>
          </button>

          <button
            id="tab-excel"
            onClick={() => setActiveTab('excel')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'excel'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>นำเข้าข้อมูล Excel</span>
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'settings'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>ตั้งค่าระบบ & ฐานข้อมูล</span>
          </button>
        </div>
      </div>
    </header>
  );
};
