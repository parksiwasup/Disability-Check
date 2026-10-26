import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  FileCheck2,
  Sparkles,
  Paperclip,
  Upload,
  Layers,
  FileText,
  Loader2
} from 'lucide-react';
import { PatientRecord } from '../types';
import { api } from '../api/client';

interface PdfPreviewModalProps {
  patient: PatientRecord | null;
  allPatients: PatientRecord[];
  onClose: () => void;
  onSelectPatient: (patient: PatientRecord) => void;
  onPatientUpdated?: (updated: PatientRecord) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  patient,
  allPatients,
  onClose,
  onSelectPatient,
  onPatientUpdated
}) => {
  if (!patient) return null;

  const [refreshKey, setRefreshKey] = useState(Date.now());
  // viewMode: 'form' | 'merged' | recordId
  const [viewMode, setViewMode] = useState<string>('form');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryPriority: Record<string, number> = {
    medical_record: 1,
    prescription: 2,
    medical_certificate: 3,
    treatment_record: 4,
    sso_document: 5
  };
  const medRecords = [...(patient.medicalRecords || [])].sort((a, b) => {
    const pA = categoryPriority[a.category || 'medical_record'] || 99;
    const pB = categoryPriority[b.category || 'medical_record'] || 99;
    if (pA !== pB) return pA - pB;
    return (a.uploadedAt || '').localeCompare(b.uploadedAt || '');
  });
  const currentIndex = allPatients.findIndex(p => p.id === patient.id);

  useEffect(() => {
    // Default to 'merged' when patient has medical records attached so user sees both form + medical records
    if ((patient.medicalRecords?.length || 0) > 0) {
      setViewMode('merged');
    } else {
      setViewMode('form');
    }
  }, [patient.id]);

  const activePdfUrl = (() => {
    if (viewMode === 'form') {
      return `${api.getPdfPreviewUrl(patient.id, false)}&k=${refreshKey}`;
    }
    if (viewMode === 'merged') {
      return `${api.getPdfPreviewUrl(patient.id, true)}&k=${refreshKey}`;
    }
    return `${api.getMedicalRecordUrl(patient.id, viewMode, false)}?k=${refreshKey}`;
  })();

  const activeDownloadUrl = (() => {
    if (viewMode === 'form') {
      return api.getPdfDownloadUrl(patient.id, false);
    }
    if (viewMode === 'merged') {
      return api.getPdfDownloadUrl(patient.id, true);
    }
    return api.getMedicalRecordUrl(patient.id, viewMode, true);
  })();

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const updated = await api.uploadMedicalRecords(patient.id, files);
      if (onPatientUpdated) {
        onPatientUpdated(updated);
      }
      onSelectPatient(updated);
      setViewMode('merged');
      setRefreshKey(Date.now());
    } catch (err: any) {
      alert(`อัปโหลดไฟล์ PDF ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectPatient(allPatients[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < allPatients.length - 1) {
      onSelectPatient(allPatients[currentIndex + 1]);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-preview-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else {
      window.open(activePdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/80">
          
          {/* Patient info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>แบบรายงาน สปส. 2-19 (PDF)</span>
                  <span className="text-xs font-normal text-slate-400">|</span>
                  <span className="text-teal-300 font-semibold">{patient.fullName}</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  HN: {patient.hn}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>เติมข้อมูลจาก Excel ลงในช่องว่างอัตโนมัติ</span>
                <span>•</span>
                <span className="text-purple-300 font-medium">สูญเสียสมรรถภาพ: {patient.impairmentRate || 0}% WPI</span>
                {medRecords.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">แนบเวชระเบียนแล้ว {medRecords.length} ไฟล์</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={handleUploadFiles}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/40 transition"
              title="แนบไฟล์ PDF เวชระเบียนเพิ่มเติมสำหรับผู้ป่วยรายนี้"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>+ แนบ PDF เวชระเบียน</span>
            </button>
            
            {/* Patient Dropdown Selector + Prev/Next */}
            <div className="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 mr-1">
              <button
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition"
                title="ผู้ป่วยก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                id="pdf-preview-patient-select"
                value={patient.id}
                onChange={(e) => {
                  const found = allPatients.find(p => p.id === e.target.value);
                  if (found) onSelectPatient(found);
                }}
                className="bg-slate-900/90 text-xs font-semibold text-teal-300 px-2.5 py-1 rounded-lg border border-slate-700/80 focus:outline-none focus:border-teal-500 cursor-pointer max-w-[230px] truncate"
                title="เลือกรายชื่อผู้ป่วย"
              >
                {allPatients.map((p, idx) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                    {idx + 1}. {p.fullName} (HN: {p.hn})
                  </option>
                ))}
              </select>

              <button
                onClick={handleNext}
                disabled={currentIndex >= allPatients.length - 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition"
                title="ผู้ป่วยถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setRefreshKey(Date.now())}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-800 transition"
              title="รีเฟรช PDF"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              id="print-pdf-btn"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>พิมพ์ (Print)</span>
            </button>

            <a
              id="download-pdf-modal-btn"
              href={activeDownloadUrl}
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold border border-teal-500/40 transition"
              title="ดาวน์โหลดเฉพาะไฟล์ที่กำลังเปิดดูอยู่"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดหน้านี้</span>
            </a>

            <button
              id="download-zip-modal-btn"
              type="button"
              disabled={isDownloadingAll}
              onClick={async () => {
                setIsDownloadingAll(true);
                try {
                  await api.downloadPatientPdfsAsZip(patient);
                } catch (err: any) {
                  alert(`ดาวน์โหลด .zip ไม่สำเร็จ: ${err.message}`);
                } finally {
                  setIsDownloadingAll(false);
                }
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-900/40 transition disabled:opacity-50"
              title="ดาวน์โหลดรวมชุดเป็นไฟล์ .zip ไฟล์เดียว ข้างในแยกชื่อครบทุกไฟล์ (ไม่ติดหน้าต่างถาม Allow)"
            >
              {isDownloadingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>ดาวน์โหลดเป็น .ZIP (ครบชุด)</span>
            </button>

            <button
              id="download-all-separate-pdf-modal-btn"
              type="button"
              disabled={isDownloadingAll}
              onClick={async () => {
                setIsDownloadingAll(true);
                try {
                  await api.downloadAllPatientPdfs(patient);
                } catch (err: any) {
                  alert(`ดาวน์โหลดไม่สำเร็จ: ${err.message}`);
                } finally {
                  setIsDownloadingAll(false);
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
              title="ดาวน์โหลดแยกเป็นรายไฟล์ PDF ลงเครื่อง"
            >
              <span>แยกทีละไฟล์ ({1 + medRecords.length})</span>
            </button>

            <button
              id="close-preview-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Switcher Sub-bar (when medical records exist or to switch modes) */}
        <div className="flex items-center gap-2 px-6 py-2 bg-slate-900/95 border-b border-slate-800 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            เลือกเอกสารที่แสดง:
          </span>

          <button
            type="button"
            onClick={() => setViewMode('form')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
              viewMode === 'form'
                ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>เฉพาะใบ สปส. 2-19</span>
          </button>

          {medRecords.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode('merged')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                viewMode === 'merged'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>รวมใบ สปส. 2-19 + เวชระเบียนต่อท้าย ({medRecords.length} ไฟล์)</span>
            </button>
          )}

          {medRecords.map((rec) => {
            const catLabel =
              rec.category === 'prescription'
                ? 'ใบสั่งยา'
                : rec.category === 'medical_certificate'
                  ? 'ใบรับรองแพทย์'
                  : rec.category === 'sso_document'
                    ? 'เอกสารปกส.'
                    : rec.category === 'treatment_record'
                      ? 'ใบบันทึกการรับรักษา'
                      : 'เวชระเบียน';
            return (
              <button
                key={rec.id}
                type="button"
                onClick={() => setViewMode(rec.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition whitespace-nowrap ${
                  viewMode === rec.id
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title={rec.originalName}
              >
                <Paperclip className="w-3 h-3" />
                <span className="max-w-[180px] truncate">{catLabel}: {rec.originalName}</span>
              </button>
            );
          })}
        </div>

        {/* PDF Embedded Viewer */}
        <div className="flex-1 bg-slate-950 p-2 relative flex items-center justify-center">
          <iframe
            id="pdf-preview-frame"
            src={`${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full rounded-xl border border-slate-800/80 bg-slate-900 shadow-inner"
            title={`สปส. 2-19 Preview - ${patient.fullName}`}
          />
        </div>

        {/* Bottom Banner */}
        <div className="bg-slate-950/90 px-6 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>รองรับการแนบไฟล์ PDF เวชระเบียนแยกตามรายบุคคล และรวมไฟล์ต่อท้ายใบ สปส. 2-19 อัตโนมัติ</span>
          </div>
          <a
            href={activePdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-teal-400 hover:text-teal-300 font-medium"
          >
            <span>เปิดในแท็บใหม่</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
