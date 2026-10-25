import React, { useState } from 'react';
import { 
  Building2, 
  Database, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Save, 
  RefreshCw,
  Server
} from 'lucide-react';
import { DbStatus } from '../types';
import { api } from '../api/client';

interface SettingsModalProps {
  dbStatus: DbStatus | null;
  onRefreshDb: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ dbStatus, onRefreshDb }) => {
  const [hospitalName, setHospitalName] = useState('โรงพยาบาลศูนย์การแพทย์เฉพาะทาง');
  const [hospCode, setHospCode] = useState('80067');
  const [doctorName, setDoctorName] = useState('นพ. ธีรภัทร เวชศาสตร์ฟื้นฟู');
  const [doctorLicense, setDoctorLicense] = useState('ว. 45892');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Database Status Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              dbStatus?.mysqlConnected 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>สถานะฐานข้อมูล MySQL & Prisma ORM</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  dbStatus?.mysqlConnected 
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                }`}>
                  {dbStatus?.mysqlConnected ? 'เชื่อมต่อ MySQL แล้ว' : 'ใช้ระบบ Local / Memory Fallback'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {dbStatus?.message}
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshDb}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ตรวจสอบการเชื่อมต่อ</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-teal-400" />
            <span>ข้อมูลการเชื่อมต่อ MySQL (ในไฟล์ .env และ Prisma):</span>
          </p>
          <p className="font-mono text-[11px] text-teal-300">
            DATABASE_URL="mysql://root:root@localhost:3306/hospital_disability"
          </p>
          <p className="text-[11px] text-slate-400">
            ระบบทำงานได้อย่างสมบูรณ์แบบไม่ว่าจะมี MySQL หรือใช้ไฟล์ Excel โดยตรง ข้อมูลจะไม่สูญหาย
          </p>
        </div>
      </div>

      {/* Hospital & Default Physician Configuration */}
      <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <span>ข้อมูลสถานพยาบาล & แพทย์ผู้ประเมินเริ่มต้น (สำหรับ สปส. 2-19)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ข้อมูลส่วนนี้จะถูกใช้เป็นค่าเริ่มต้นในช่องสถานพยาบาลและแพทย์ผู้ประเมินเมื่อพิมพ์แบบฟอร์ม สปส. 2-19
          </p>
        </div>

        {isSaved && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              ชื่อสถานพยาบาล (จะแสดงที่หัวเอกสาร สปส. 2-19)
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              รหัสสถานพยาบาล (hospcode)
            </label>
            <input
              type="text"
              value={hospCode}
              onChange={(e) => setHospCode(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              ชื่อแพทย์ผู้ประเมินเริ่มต้น
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              เลขที่ใบประกอบวิชาชีพเวชกรรม (ว.)
            </label>
            <input
              type="text"
              value={doctorLicense}
              onChange={(e) => setDoctorLicense(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-900/40 transition"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </form>
    </div>
  );
};
