import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  FileDown, 
  Database,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';

interface ExcelUploaderProps {
  onUploadSuccess: () => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setUploadResult({ success: false, message: 'กรุณาอัปโหลดไฟล์นามสกุล .xlsx หรือ .xls เท่านั้น' });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    try {
      const res = await api.uploadExcel(file);
      setUploadResult({ success: true, message: res.message });
      onUploadSuccess();
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const expectedColumns = [
    { name: 'HN', desc: 'เลขประจำตัวผู้ป่วย (เช่น 000090700)', required: true },
    { name: 'ชื่อ-สกุล', desc: 'ชื่อและนามสกุลผู้ประกันตน (เช่น นายรัสมี ลีทอง)', required: true },
    { name: 'เลขบัตรประชาชน', desc: 'เลขประจำตัวประชาชน 13 หลัก', required: true },
    { name: 'แผนก', desc: 'แผนกที่ตรวจรักษา เช่น ศัลยกรรม, ทันตกรรม, อายุรกรรม', required: true },
    { name: 'อาการสำคัญ', desc: 'ประวัติและอาการสำคัญ เช่น ปวดแผลร้าวไปขาซ้าย, โรคลมชัก', required: true },
    { name: 'ผลวินิจฉัยหลัก', desc: 'รหัส ICD-10 เช่น Z480, K0539, E113', required: true },
    { name: 'ผลวินิจฉัยอื่น', desc: 'รหัส ICD-10 โรคร่วม/แทรกซ้อน เช่น Z099, H3600', required: false },
    { name: 'วันที่รักษา', desc: 'วันที่เข้ารับการตรวจรักษาในระบบโรงพยาบาล', required: false },
    { name: 'เบอร์มือถือ', desc: 'หมายเลขโทรศัพท์ติดต่อ', required: false },
    { name: 'ชื่อสิทธิHOSxP', desc: 'สิทธิการรักษาประกันสังคมทุพลภาพ (สปส.2-19)', required: false }
  ];

  return (
    <div className="space-y-6">
      
      {/* Upload Zone Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-400" />
            <span>นำเข้าข้อมูลเวชระเบียนผู้ป่วยจากไฟล์ Excel (HOSxP / Hospital Export)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            รองรับไฟล์ส่งออกจากระบบโรงพยาบาล HOSxP ข้อมูลจะถูกนำไปจับคู่กับช่องว่างในแบบฟอร์ม สปส. 2-19 อัตโนมัติ
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center cursor-pointer ${
            isDragging 
              ? 'border-teal-400 bg-teal-500/10 scale-[1.01]' 
              : 'border-slate-700/80 hover:border-teal-500/50 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
          onClick={() => document.getElementById('excel-file-input')?.click()}
        >
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 shadow-lg shadow-teal-950/40">
            <Upload className="w-7 h-7" />
          </div>

          <p className="text-sm font-semibold text-white">
            ลากและวางไฟล์ Excel (.xlsx, .xls) ลงที่นี่ หรือ <span className="text-teal-400 underline">คลิกเพื่อเลือกไฟล์</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            รองรับโครงสร้างคอลัมน์มาตรฐานโรงพยาบาล เช่น ไฟล์ <b>ทดสอบทุพพลภาพ.xlsx</b>
          </p>

          {isUploading && (
            <div className="mt-4 flex items-center space-x-2 text-xs text-teal-400 font-semibold">
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังประมวลผลไฟล์และซิงค์ข้อมูล...</span>
            </div>
          )}
        </div>

        {/* Upload Status Alert */}
        {uploadResult && (
          <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
            uploadResult.success 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}>
            {uploadResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-medium">{uploadResult.message}</span>
          </div>
        )}

        {/* Action button to load sample data */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>มีไฟล์ตัวอย่างพร้อมใช้งาน: <b>ทดสอบทุพพลภาพ.xlsx</b></span>
          </div>

          <a
            id="download-sample-excel-btn"
            href="/sample_data.xlsx"
            download="ทดสอบทุพพลภาพ.xlsx"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <FileDown className="w-4 h-4 text-teal-400" />
            <span>ดาวน์โหลดไฟล์แม่แบบ Excel</span>
          </a>
        </div>
      </div>

      {/* Expected Excel Columns Documentation */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-400" />
          <span>ตารางคอลัมน์ Excel ที่ระบบนำไปใส่ในแบบฟอร์ม สปส. 2-19</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {expectedColumns.map((col, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-start space-x-3"
            >
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                col.required 
                  ? 'bg-teal-950 text-teal-300 border border-teal-800' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {col.name}
              </span>
              <div className="flex-1">
                <p className="text-xs text-slate-300">{col.desc}</p>
                <span className="text-[10px] text-slate-500">
                  {col.required ? 'จำเป็นสำหรับ สปส. 2-19' : 'คอลัมน์เสริม'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
