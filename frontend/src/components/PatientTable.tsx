import React, { useState, useRef } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  UserCheck, 
  Phone,
  Activity,
  Calendar,
  AlertTriangle,
  Type,
  Paperclip,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Plus,
  X,
  Copy,
  Check
} from 'lucide-react';
import { PatientRecord, MedicalDocumentCategory } from '../types';
import { api } from '../api/client';

interface PatientTableProps {
  patients: PatientRecord[];
  onSelectPatient: (patient: PatientRecord) => void;
  onPreviewPdf: (patient: PatientRecord) => void;
  onOpenWordStudio?: (patient: PatientRecord) => void;
  onPatientUpdated?: (updated: PatientRecord) => void;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  onSelectPatient,
  onPreviewPdf,
  onOpenWordStudio,
  onPatientUpdated
}) => {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [targetUpload, setTargetUpload] = useState<{ patient: PatientRecord; category: MedicalDocumentCategory } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    patient: PatientRecord;
    recordId: string;
    fileName: string;
    isPermanent: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadingPatientId, setDownloadingPatientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyText = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1500);
  };

  const departments = Array.from(new Set(patients.map(p => p.department).filter(Boolean)));

  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.hn.includes(search) ||
      p.idCard.includes(search) ||
      p.diagPrimary.toLowerCase().includes(search.toLowerCase()) ||
      p.chiefComplaint.toLowerCase().includes(search.toLowerCase());

    const matchesDept = selectedDept === 'all' || p.department === selectedDept;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleDownload = async (e: React.MouseEvent, patient: PatientRecord) => {
    e.stopPropagation();
    if (downloadingPatientId === patient.id) return;
    setDownloadingPatientId(patient.id);
    try {
      await api.downloadPatientPdfsAsZip(patient);
    } catch (err: any) {
      alert(`ดาวน์โหลดไฟล์ .zip ไม่สำเร็จ: ${err.message}`);
    } finally {
      setDownloadingPatientId(null);
    }
  };

  const triggerUploadForPatient = (
    e: React.MouseEvent,
    patient: PatientRecord,
    category: MedicalDocumentCategory
  ) => {
    e.stopPropagation();
    setTargetUpload({ patient, category });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !targetUpload) return;

    const { patient, category } = targetUpload;
    setUploadingKey(`${patient.id}_${category}`);
    try {
      const updated = await api.uploadMedicalRecords(patient.id, files, category);
      if (onPatientUpdated) {
        onPatientUpdated(updated);
      }
    } catch (err: any) {
      alert(`อัปโหลดไฟล์ PDF ไม่สำเร็จ: ${err.message}`);
    } finally {
      setUploadingKey(null);
      setTargetUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteRecord = (
    e: React.MouseEvent,
    patient: PatientRecord,
    recordId: string,
    fileName: string,
    isPermanent = false
  ) => {
    e.stopPropagation();
    setPendingDelete({ patient, recordId, fileName, isPermanent });
  };

  const confirmDeleteRecord = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const updated = await api.deleteMedicalRecord(pendingDelete.patient.id, pendingDelete.recordId);
      if (onPatientUpdated) {
        onPatientUpdated(updated);
      }
      setPendingDelete(null);
    } catch (err: any) {
      alert(`ลบไฟล์ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPdfCategoryCell = (
    patient: PatientRecord,
    category: MedicalDocumentCategory,
    buttonLabel: string,
    accent: 'emerald' | 'cyan' | 'purple' | 'amber',
    isPermanent = false
  ) => {
    const allRecords = patient.medicalRecords || [];
    const records = allRecords.filter(r => (r.category || 'medical_record') === category);
    const isUploadingThis = uploadingKey === `${patient.id}_${category}`;

    const badgeClasses =
      accent === 'emerald'
        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 shadow-sm shadow-emerald-950/50'
        : accent === 'amber'
          ? 'bg-amber-950/60 border-amber-500/50 text-amber-200 shadow-sm shadow-amber-950/50'
          : accent === 'cyan'
            ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
            : 'bg-purple-950/50 border-purple-500/40 text-purple-300';

    const iconColor =
      accent === 'emerald'
        ? 'text-emerald-400'
        : accent === 'amber'
          ? 'text-amber-400'
          : accent === 'cyan'
            ? 'text-cyan-400'
            : 'text-purple-400';

    const hoverUploadClasses =
      accent === 'emerald'
        ? 'hover:bg-emerald-950/50 hover:text-emerald-300 hover:border-emerald-500/50'
        : accent === 'amber'
          ? 'hover:bg-amber-950/50 hover:text-amber-300 hover:border-amber-500/50'
          : accent === 'cyan'
            ? 'hover:bg-cyan-950/50 hover:text-cyan-300 hover:border-cyan-500/50'
            : 'hover:bg-purple-950/50 hover:text-purple-300 hover:border-purple-500/50';

    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full">
        {records.length > 0 ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-center space-x-1 w-full"
              >
                <a
                  href={api.getMedicalRecordUrl(patient.id, rec.id, false)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex-shrink-0"
                  title={`เปิดดูไฟล์: ${rec.originalName}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                </a>

                <a
                  href={api.getMedicalRecordUrl(patient.id, rec.id, false)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center space-x-1 px-2 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg text-[11px] font-semibold shadow-sm shadow-teal-900/50 transition truncate min-w-0 flex-1"
                  title={`คลิกเพื่อเปิดดู: ${rec.originalName}`}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{rec.originalName}</span>
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const label = api.getCategoryThaiName(category);
                    api.triggerBlobDownload(
                      api.getMedicalRecordUrl(patient.id, rec.id, true),
                      `${label}_${patient.fullName}.pdf`
                    );
                  }}
                  className="p-1.5 text-teal-400 hover:text-teal-200 bg-teal-950/40 hover:bg-teal-900/40 rounded-lg border border-teal-500/30 transition flex-shrink-0"
                  title={`ดาวน์โหลด ${api.getCategoryThaiName(category)}: ${rec.originalName}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteRecord(e, patient, rec.id, rec.originalName, isPermanent)}
                  className="p-1.5 text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/40 rounded-lg border border-rose-500/30 transition flex-shrink-0"
                  title={`ลบไฟล์: ${rec.originalName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button
            id={`btn-upload-${category}-${patient.hn}`}
            type="button"
            disabled={isUploadingThis}
            onClick={(e) => triggerUploadForPatient(e, patient, category)}
            className={`inline-flex items-center justify-center space-x-1 px-2 py-1.5 w-full rounded-lg bg-slate-800/80 text-slate-300 border border-dashed border-slate-600 text-[11px] font-medium transition truncate ${hoverUploadClasses}`}
            title={
              isPermanent
                ? `อัปโหลด${buttonLabel} (บันทึกอยู่กับ ${patient.fullName} ตลอดไป)`
                : `อัปโหลด${buttonLabel}ของ ${patient.fullName}`
            }
          >
            {isUploadingThis ? (
              <>
                <Loader2 className={`w-3 h-3 animate-spin flex-shrink-0 ${iconColor}`} />
                <span className="truncate">อัปโหลด...</span>
              </>
            ) : (
              <>
                <Upload className={`w-3 h-3 flex-shrink-0 ${iconColor}`} />
                <span className="truncate">{buttonLabel}</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input for Per-Patient Medical Record PDF Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-patient-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาด้วย ชื่อ-สกุล, HN, เลขบัตร, ICD-10, หรืออาการ..."
            className="w-full bg-slate-800/90 text-sm text-slate-100 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>แผนก:</span>
            <select
              id="filter-department-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">ทั้งหมด ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-slate-900">{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-300">
            <span>สถานะ:</span>
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">ทุกสถานะ</option>
              <option value="ตรวจแล้ว" className="bg-slate-900">ตรวจแล้ว</option>
              <option value="รอรับยา" className="bg-slate-900">รอรับยา</option>
              <option value="รอประเมิน" className="bg-slate-900">รอประเมิน</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300 table-fixed">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-2 w-[2.5%] text-center">#</th>
                <th className="py-3 px-2 w-[7.5%]">HN / VN</th>
                <th className="py-3 px-2 w-[12.5%]">ผู้ขอรับการประเมิน</th>
                <th className="py-3 px-2 w-[7.5%]">แผนก / วันที่ตรวจ</th>
                <th className="py-3 px-2 w-[12%]">อาการสำคัญ & การวินิจฉัย (ICD-10)</th>
                <th className="py-2.5 px-1.5 w-[11.5%] text-center bg-emerald-950/20 border-l border-slate-800/80">
                  <div className="text-emerald-300 font-bold">ไฟล์ PDF เวชระเบียน</div>
                  <div className="text-[9px] text-emerald-400/80 font-medium normal-case mt-0.5">📌 อยู่กับบุคคลนี้ตลอดไป</div>
                </th>
                <th className="py-2.5 px-1.5 w-[11.5%] text-center bg-amber-950/20 border-r border-slate-800/80">
                  <div className="text-amber-300 font-bold">ไฟล์ PDF เอกสารปกส.</div>
                  <div className="text-[9px] text-amber-400/80 font-medium normal-case mt-0.5">📌 อยู่กับบุคคลนี้ตลอดไป</div>
                </th>
                <th className="py-2.5 px-1.5 w-[11.5%] text-center">
                  <div className="text-cyan-300 font-bold">ไฟล์ PDF ใบสั่งยา</div>
                  <div className="text-[9px] text-slate-500 font-normal normal-case mt-0.5">เอกสารประกอบ</div>
                </th>
                <th className="py-2.5 px-1.5 w-[11.5%] text-center">
                  <div className="text-purple-300 font-bold">ไฟล์ PDF ใบรับรองแพทย์</div>
                  <div className="text-[9px] text-slate-500 font-normal normal-case mt-0.5">เอกสารประกอบ</div>
                </th>
                <th className="py-3 px-2 w-[12%] text-right">ดำเนินการ (สปส. 2-19)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-normal">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
                    ไม่พบข้อมูลผู้ขอรับการประเมินตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, idx) => (
                  <tr 
                    key={patient.id}
                    onClick={() => onSelectPatient(patient)}
                    className="hover:bg-slate-800/50 cursor-pointer transition group"
                  >
                    <td className="py-3 px-2 font-mono text-xs text-slate-500 text-center">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-2 truncate">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold text-teal-300 text-xs truncate">
                          {patient.hn}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(e, patient.hn, `hn-${patient.id}`)}
                          className="p-0.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-teal-300 transition flex-shrink-0"
                          title={`คัดลอก HN: ${patient.hn}`}
                        >
                          {copiedKey === `hn-${patient.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        VN: {patient.vn}
                      </div>
                    </td>

                    <td className="py-3 px-2">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                        <span className="truncate">{patient.fullName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                        <span className="truncate">ID: {patient.idCard}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(e, patient.idCard, `id-${patient.id}`)}
                          className="p-0.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-teal-300 transition flex-shrink-0"
                          title={`คัดลอกเลขบัตรประชาชน: ${patient.idCard}`}
                        >
                          {copiedKey === `id-${patient.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-2">
                      <div className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[11px] font-medium text-slate-300 truncate max-w-full">
                        {patient.department}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{patient.treatmentDate}</span>
                      </div>
                    </td>

                    <td className="py-3 px-2">
                      <div className="text-xs text-slate-200 truncate" title={patient.chiefComplaint}>
                        {patient.chiefComplaint}
                      </div>
                      <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-0.5">
                        <span className="font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50 flex-shrink-0">
                          {patient.diagPrimary}
                        </span>
                        <span className="text-[11px] font-normal text-slate-400 truncate">
                          {patient.diagPrimaryName}
                        </span>
                      </div>
                    </td>

                    {/* Column 1 (Permanent): ไฟล์ PDF เวชระเบียน */}
                    <td className="py-3 px-1.5 text-center bg-emerald-950/10 border-l border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                      {renderPdfCategoryCell(patient, 'medical_record', 'แนบเวชระเบียน', 'emerald', true)}
                    </td>

                    {/* Column 2 (Permanent): ไฟล์ PDF เอกสารปกส. */}
                    <td className="py-3 px-1.5 text-center bg-amber-950/10 border-r border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                      {renderPdfCategoryCell(patient, 'sso_document', 'แนบเอกสารปกส.', 'amber', true)}
                    </td>

                    {/* Column 3: ไฟล์ PDF ใบสั่งยา */}
                    <td className="py-3 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {renderPdfCategoryCell(patient, 'prescription', 'แนบใบสั่งยา', 'cyan', false)}
                    </td>

                    {/* Column 4: ไฟล์ PDF ใบรับรองแพทย์ */}
                    <td className="py-3 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {renderPdfCategoryCell(patient, 'medical_certificate', 'แนบใบรับรองแพทย์', 'purple', false)}
                    </td>

                    <td className="py-3 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-view-${patient.hn}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(patient);
                            }}
                            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                            title="ดูรายละเอียด / จัดการไฟล์แนบเวชระเบียน"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Word Studio Jump */}
                          {onOpenWordStudio && (
                            <button
                              id={`btn-word-${patient.hn}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenWordStudio(patient);
                              }}
                              className="p-1.5 text-blue-400 hover:text-blue-200 bg-blue-950/40 hover:bg-blue-900/40 rounded-lg border border-blue-500/30 transition"
                              title="จัดฟอนต์และขยับตำแหน่ง (Word Studio)"
                            >
                              <Type className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            id={`btn-preview-pdf-${patient.hn}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewPdf(patient);
                            }}
                            className="flex items-center space-x-1 px-2 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg text-[11px] font-semibold shadow-sm shadow-teal-900/50 transition"
                            title="สร้างและดูตัวอย่าง สปส. 2-19 (พร้อมเวชระเบียนที่แนบ)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>สร้าง สปส.2-19</span>
                          </button>

                          <button
                            id={`btn-download-pdf-${patient.hn}`}
                            disabled={downloadingPatientId === patient.id}
                            onClick={(e) => handleDownload(e, patient)}
                            className="p-1.5 text-teal-400 hover:text-teal-200 bg-teal-950/40 hover:bg-teal-900/40 rounded-lg border border-teal-500/30 transition disabled:opacity-50"
                            title={`ดาวน์โหลดครบชุดเป็นไฟล์ .ZIP (${1 + (patient.medicalRecords?.length || 0)} ไฟล์: สปส.2-19, เวชระเบียน, เอกสารปกส., ใบสั่งยา, ใบรับรองแพทย์)`}
                          >
                            {downloadingPatientId === patient.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-950/40 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>แสดง {filteredPatients.length} จาก {patients.length} รายการ</span>
          <span>ข้อมูลพร้อมออกเอกสาร สปส. 2-19 อัตโนมัติ</span>
        </div>
      </div>

      {/* Custom Modern Delete Confirmation Modal */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeleting && setPendingDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ยืนยันการลบไฟล์เอกสาร PDF</h3>
                  <p className="text-[11px] text-slate-400">
                    ผู้ป่วย: <span className="text-teal-300 font-semibold">{pendingDelete.patient.fullName}</span> (HN: {pendingDelete.patient.hn})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDelete(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {pendingDelete.fileName}
                </span>
              </div>

              {pendingDelete.isPermanent ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    ไฟล์นี้เป็น <b>เอกสารถาวรประจำตัวผู้ป่วย</b> (ผูกอยู่กับบุคคลนี้ตลอดไป) หากลบออกจะต้องอัปโหลดใหม่เมื่อต้องการใช้งาน
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-300">
                  คุณต้องการลบไฟล์เอกสารนี้ออกจากรายการของ <b>{pendingDelete.patient.fullName}</b> ใช่หรือไม่?
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/60">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteRecord}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบไฟล์</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
