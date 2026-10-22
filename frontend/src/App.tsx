import React, { useState, useEffect } from 'react';
import { Header, TabType } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { PatientTable } from './components/PatientTable';
import { PatientDetailModal } from './components/PatientDetailModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { VisualFieldMapper } from './components/VisualFieldMapper';
import { WordFontStudio } from './components/WordFontStudio';
import { ExcelUploader } from './components/ExcelUploader';
import { DepartmentChart } from './components/DepartmentChart';
import { SettingsModal } from './components/SettingsModal';
import { PatientRecord, StatsData, DbStatus } from './types';
import { api } from './api/client';
import { 
  FileText, 
  Users, 
  Upload, 
  Download, 
  Sparkles, 
  Type
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [previewPatient, setPreviewPatient] = useState<PatientRecord | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [pts, st, db] = await Promise.all([
        api.getPatients(),
        api.getStats(),
        api.getDbStatus()
      ]);
      setPatients(pts);
      setStats(st);
      setDbStatus(db);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientUpdated = (updated: PatientRecord) => {
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPatient(updated);
    api.getStats().then(setStats);
  };

  const handleBatchDownloadAll = () => {
    if (patients.length === 0) return;
    patients.forEach((p, idx) => {
      setTimeout(() => {
        window.open(api.getPdfDownloadUrl(p.id), '_blank');
      }, idx * 400);
    });
  };

  return (
    <div className="min-h-screen bg-[#080E1A] text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      
      {/* Hospital Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dbStatus={dbStatus}
        onRefresh={fetchInitialData}
        isLoading={isLoading}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner with Quick Actions on Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-teal-950/50 border border-blue-500/20 p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ระบบสร้างและเติมข้อมูลแบบฟอร์ม สปส. 2-19 จาก Excel อัตโนมัติ</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  แบบประเมินและวินิจฉัยการสูญเสียสมรรถภาพทางกายและจิตใจ
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  ดึงข้อมูลผู้ป่วยจาก Excel และเติมลงในช่องว่างของเอกสาร <b>สปส. 2-19</b> ได้อย่างแม่นยำ พร้อมเครื่องมือ <b>Word Studio</b> ให้คุณเลือกฟอนต์ราชการ ปรับขนาด และขยับตำแหน่งได้ด้วยตัวเอง
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="dashboard-goto-word-studio-btn"
                  onClick={() => setActiveTab('word-studio')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-900/40 transition hover:-translate-y-0.5"
                >
                  <Type className="w-4 h-4" />
                  <span>เปิดเครื่องมือจัดฟอนต์ (Word Studio)</span>
                </button>

                <button
                  id="dashboard-batch-print-btn"
                  onClick={handleBatchDownloadAll}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>ดาวน์โหลด PDF ทั้งหมด ({patients.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            <StatsCards stats={stats} />
            <DepartmentChart stats={stats} />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>รายชื่อผู้ขอรับการประเมินล่าสุด (พร้อมพิมพ์ สปส. 2-19)</span>
                </h3>
                <button
                  onClick={() => setActiveTab('patients')}
                  className="text-xs text-teal-400 hover:underline font-medium"
                >
                  ดูทะเบียนผู้ป่วยทั้งหมด ({patients.length}) →
                </button>
              </div>
              <PatientTable
                patients={patients}
                onSelectPatient={(p) => setSelectedPatient(p)}
                onPreviewPdf={(p) => setPreviewPatient(p)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Patient Assessment Registry */}
        {activeTab === 'patients' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">ทะเบียนผู้ขอรับการประเมินทุพพลภาพ</h2>
                <p className="text-xs text-slate-400">ตรวจสอบและแก้ไขข้อมูลเวชระเบียนก่อนพิมพ์แบบฟอร์ม สปส. 2-19</p>
              </div>
              <button
                onClick={() => setActiveTab('excel')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้าไฟล์ Excel เพิ่มเติม</span>
              </button>
            </div>
            <PatientTable
              patients={patients}
              onSelectPatient={(p) => setSelectedPatient(p)}
              onPreviewPdf={(p) => setPreviewPatient(p)}
            />
          </div>
        )}

        {/* Tab 3: Word Studio (เครื่องมือจัดฟอนต์เหมือน Word) */}
        {activeTab === 'word-studio' && (
          <div className="animate-fadeIn">
            <WordFontStudio patients={patients} />
          </div>
        )}

        {/* Tab 4: PDF Studio & Coordinate Mapper */}
        {activeTab === 'pdf-studio' && (
          <div className="animate-fadeIn">
            <VisualFieldMapper patients={patients} />
          </div>
        )}

        {/* Tab 5: Excel Uploader */}
        {activeTab === 'excel' && (
          <div className="animate-fadeIn">
            <ExcelUploader onUploadSuccess={fetchInitialData} />
          </div>
        )}

        {/* Tab 6: Settings */}
        {activeTab === 'settings' && (
          <div className="animate-fadeIn">
            <SettingsModal dbStatus={dbStatus} onRefreshDb={fetchInitialData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ระบบประเมินทุพพลภาพและพิมพ์แบบฟอร์ม สปส. 2-19 (Hospital Disability Check System)</span>
          <span>รองรับ React + TypeScript + Vite + Tailwind CSS + Node.js Express + Prisma + MySQL</span>
        </div>
      </footer>

      {/* Detail / Edit Clinical Notes Modal */}
      <PatientDetailModal
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onSave={handlePatientUpdated}
        onOpenPdf={(p) => {
          setSelectedPatient(null);
          setPreviewPatient(p);
        }}
      />

      {/* Fullscreen Interactive PDF Preview Modal */}
      <PdfPreviewModal
        patient={previewPatient}
        allPatients={patients}
        onClose={() => setPreviewPatient(null)}
        onSelectPatient={(p) => setPreviewPatient(p)}
      />
    </div>
  );
}
