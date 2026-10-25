import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Save, 
  RotateCcw, 
  Download, 
  Eye, 
  Sliders, 
  Check, 
  Info,
  CheckSquare
} from 'lucide-react';
import { PatientRecord, FieldConfig } from '../types';
import { api } from '../api/client';

interface VisualFieldMapperProps {
  patients: PatientRecord[];
}

export const VisualFieldMapper: React.FC<VisualFieldMapperProps> = ({ patients }) => {
  const [mappings, setMappings] = useState<FieldConfig[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  useEffect(() => {
    loadMappings();
  }, []);

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients]);

  const loadMappings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFieldMappings();
      setMappings(data);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error loading mappings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoordinateChange = (id: string, field: 'x' | 'y' | 'fontSize', value: number) => {
    setHasChanges(true);
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateFieldMappings(mappings);
      setSaveSuccess(true);
      setHasChanges(false);
      setPreviewKey(Date.now());
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: any) {
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadAll = () => {
    if (patients.length === 0) return;
    patients.forEach((p, idx) => {
      setTimeout(() => {
        window.open(api.getPdfDownloadUrl(p.id), '_blank');
      }, idx * 500);
    });
  };

  return (
    <div className="space-y-4">
      {/* Studio Header Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-400" />
              <span>สตูดิโอจัดการพิกัดแบบฟอร์ม สปส. 2-19 (PDF Visual Field Studio)</span>
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
              Live Coordinate Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ปรับตำแหน่ง (X, Y) และขนาดตัวอักษรของข้อมูลจาก Excel ให้ตรงกับช่องว่างในแบบฟอร์ม สปส. 2-19 ได้อย่างแม่นยำ
          </p>
        </div>

        {/* Patient selector and Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
            <span className="text-xs text-slate-400">เลือกผู้ป่วยทดสอบ:</span>
            <select
              id="select-studio-patient"
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setPreviewKey(Date.now());
              }}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.hn} - {p.fullName} ({p.department})
                </option>
              ))}
            </select>
          </div>

          {/* Unsaved Changes / Saved Status Indicator */}
          {hasChanges ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>มีการเปลี่ยนแปลง (ยังไม่ได้บันทึก)</span>
            </div>
          ) : saveSuccess ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกสำเร็จแล้ว</span>
            </div>
          ) : null}

          <button
            id="btn-save-mappings"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center space-x-1.5 px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 active:scale-95 ${
              hasChanges 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 ring-2 ring-teal-300 shadow-teal-900/50 scale-105' 
                : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-teal-900/40'
            }`}
            title="กดบันทึกพิกัดฟอร์ม (Ctrl + S)"
          >
            {saveSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'บันทึกสำเร็จแล้ว!' : isSaving ? 'กำลังบันทึก...' : 'บันทึกพิกัดฟอร์ม'}</span>
          </button>

          <button
            id="btn-batch-download"
            onClick={handleDownloadAll}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="ดาวน์โหลด PDF ของผู้ป่วยทุกคนตามลำดับ"
          >
            <Download className="w-4 h-4" />
            <span>สร้างทุกรายการ (Batch)</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left PDF Preview + Right Coordinate Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: PDF Live Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/70 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5 text-teal-300">
              <Eye className="w-4 h-4" />
              <span>ตัวอย่างเอกสาร สปส. 2-19 เติมข้อมูลจริงแบบเรียลไทม์</span>
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-[11px] text-slate-400 font-mono">
                HN: {selectedPatient?.hn} • {selectedPatient?.fullName}
              </span>
              <a
                href={api.getPdfDownloadUrl(selectedPatient?.id || '')}
                download
                className="text-teal-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> โหลดไฟล์นี้
              </a>
            </div>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 h-[760px] bg-slate-950 p-2 shadow-2xl flex items-center justify-center relative">
            {selectedPatient ? (
              <iframe
                key={previewKey}
                src={`${api.getPdfPreviewUrl(selectedPatient.id)}&k=${previewKey}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full h-full rounded-xl bg-slate-900 border border-slate-800"
                title="สปส. 2-19 Live PDF Studio Preview"
              />
            ) : (
              <div className="text-slate-500 text-sm">ไม่มีข้อมูลผู้ป่วยเพื่อแสดงตัวอย่าง</div>
            )}
          </div>
        </div>

        {/* Right: Field Coordinate Mapper Table (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/70 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5 text-purple-300">
              <Sliders className="w-4 h-4" />
              <span>รายการฟิลด์ & พิกัดบนหน้าเอกสาร ({mappings.length} จุด)</span>
            </span>
            <button
              onClick={loadMappings}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> คืนค่าเริ่มต้น
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 h-[760px] overflow-y-auto p-3 space-y-2.5">
            <div className="p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>
                • เลขบัตร 13 หลัก ลงกล่องสี่เหลี่ยมอัตโนมัติ<br />
                • เช็กบ็อกซ์ [✓] ผู้ป่วยนอก, สถานพยาบาล, สำนักงานประกันสังคม และเอกสารแนบ ติ๊กถูกอัตโนมัติ<br />
                • เมื่อปรับค่าพิกัดให้กด <b>"บันทึกพิกัดฟอร์ม"</b> ด้านบน
              </span>
            </div>

            {mappings.map((mapping) => {
              const rawVal = (selectedPatient as any)?.[mapping.key];
              const sampleVal = String(rawVal !== undefined && rawVal !== null ? rawVal : '-');

              return (
                <div 
                  key={mapping.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200">{mapping.label}</span>
                      {mapping.section && (
                        <span className="ml-1.5 text-[10px] font-medium text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                          {mapping.section}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Font: {mapping.fontSize}pt
                    </span>
                  </div>

                  {/* Value preview from Excel */}
                  <div className="text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80 truncate font-mono">
                    <span className="text-slate-500">ค่าจาก Excel: </span>
                    <span className="text-cyan-300">{sampleVal}</span>
                  </div>

                  {/* Coordinate Inputs */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">พิกัด X (แนวนอน)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={mapping.x}
                        onChange={(e) => handleCoordinateChange(mapping.id, 'x', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">พิกัด Y (แนวตั้ง)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={mapping.y}
                        onChange={(e) => handleCoordinateChange(mapping.id, 'y', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">ขนาดฟอนต์ (pt)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={mapping.fontSize}
                        onChange={(e) => handleCoordinateChange(mapping.id, 'fontSize', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
