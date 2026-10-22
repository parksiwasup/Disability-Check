import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { PatientRecord } from '../types';
import { api } from '../api/client';

interface PdfPreviewModalProps {
  patient: PatientRecord | null;
  allPatients: PatientRecord[];
  onClose: () => void;
  onSelectPatient: (patient: PatientRecord) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  patient,
  allPatients,
  onClose,
  onSelectPatient
}) => {
  if (!patient) return null;

  const [refreshKey, setRefreshKey] = useState(Date.now());
  const currentIndex = allPatients.findIndex(p => p.id === patient.id);
  const pdfUrl = `${api.getPdfPreviewUrl(patient.id)}&k=${refreshKey}`;

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
      window.open(api.getPdfPreviewUrl(patient.id), '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          
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
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Pagination between patients */}
            <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/70 mr-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition"
                title="ผู้ป่วยก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-300 px-2">
                {currentIndex + 1} / {allPatients.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex >= allPatients.length - 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition"
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
              href={api.getPdfDownloadUrl(patient.id)}
              download
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-900/40 transition"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด PDF</span>
            </a>

            <button
              id="close-preview-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Embedded Viewer */}
        <div className="flex-1 bg-slate-950 p-2 relative flex items-center justify-center">
          <iframe
            id="pdf-preview-frame"
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full rounded-xl border border-slate-800/80 bg-slate-900 shadow-inner"
            title={`สปส. 2-19 Preview - ${patient.fullName}`}
          />
        </div>

        {/* Bottom Banner */}
        <div className="bg-slate-950/90 px-6 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>ฟอนต์ภาษาไทย Tahoma รองรับสระ วรรณยุกต์ และข้อความทางราชการได้อย่างถูกต้อง 100%</span>
          </div>
          <a
            href={api.getPdfPreviewUrl(patient.id)}
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
