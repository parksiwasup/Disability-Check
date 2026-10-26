import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  FileText, 
  Download, 
  User, 
  Stethoscope, 
  Activity, 
  Calendar, 
  ShieldCheck,
  AlertCircle,
  Paperclip,
  Upload,
  Trash2,
  Eye,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { PatientRecord, MedicalDocumentCategory } from '../types';
import { api } from '../api/client';

interface PatientDetailModalProps {
  patient: PatientRecord | null;
  onClose: () => void;
  onSave: (updated: PatientRecord) => void;
  onOpenPdf: (patient: PatientRecord) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  onClose,
  onSave,
  onOpenPdf
}) => {
  if (!patient) return null;

  const [formData, setFormData] = useState<PatientRecord>({ ...patient });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<MedicalDocumentCategory>('medical_record');
  const [activePreviewRecordId, setActivePreviewRecordId] = useState<string | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<{ id: string; fileName: string; isPermanent: boolean } | null>(null);
  const [isDeletingPdf, setIsDeletingPdf] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormData({ ...patient });
    setActivePreviewRecordId(null);
  }, [patient]);

  const triggerCategoryUpload = (cat: MedicalDocumentCategory) => {
    setUploadCategory(cat);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
      pdfInputRef.current.click();
    }
  };

  const handleUploadMedicalPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingPdf(true);
    setSuccessMsg('');
    try {
      const updated = await api.uploadMedicalRecords(formData.id, files, uploadCategory);
      setFormData(updated);
      onSave(updated);
      const catLabel =
        uploadCategory === 'prescription'
          ? 'ใบสั่งยา'
          : uploadCategory === 'medical_certificate'
            ? 'ใบรับรองแพทย์'
            : uploadCategory === 'sso_document'
              ? 'เอกสารปกส.'
              : uploadCategory === 'treatment_record'
                ? 'ใบบันทึกการรับรักษา'
                : 'เวชระเบียน';
      setSuccessMsg(`แนบไฟล์ PDF ${catLabel}สำเร็จ (${files.length} ไฟล์)`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(`อัปโหลดไฟล์ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const handleDeleteMedicalPdf = (recordId: string, fileName: string, isPermanent = false) => {
    setPendingDeleteRecord({ id: recordId, fileName, isPermanent });
  };

  const confirmDeleteMedicalPdf = async () => {
    if (!pendingDeleteRecord) return;
    setIsDeletingPdf(true);
    try {
      const updated = await api.deleteMedicalRecord(formData.id, pendingDeleteRecord.id);
      setFormData(updated);
      onSave(updated);
      if (activePreviewRecordId === pendingDeleteRecord.id) {
        setActivePreviewRecordId(null);
      }
      setPendingDeleteRecord(null);
      setSuccessMsg('ลบไฟล์ PDF เรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`ลบไฟล์ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsDeletingPdf(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    try {
      const updated = await api.updatePatient(formData.id, formData);
      onSave(updated);
      setSuccessMsg('บันทึกข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{formData.fullName}</h2>
                <span className="font-mono text-xs bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700">
                  HN: {formData.hn}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  VN: {formData.vn}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                เลขประจำตัวประชาชน: <span className="font-mono text-slate-300">{formData.idCard}</span> • เบอร์โทร: <span className="font-mono text-slate-300">{formData.phone}</span>
              </p>
            </div>
          </div>

          <button
            id="close-detail-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Clinical Info from Excel / HOSxP */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4" />
              <span>ข้อมูลการตรวจรักษาจากโรงพยาบาล (นำเข้าจาก Excel)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">วันที่ตรวจรักษา</label>
                <input
                  type="date"
                  value={formData.treatmentDate}
                  onChange={(e) => setFormData({ ...formData, treatmentDate: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">แผนกตรวจ</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ห้องตรวจ</label>
                <input
                  type="text"
                  value={formData.clinicRoom}
                  onChange={(e) => setFormData({ ...formData, clinicRoom: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">อาการสำคัญ (Chief Complaint)</label>
              <textarea
                rows={2}
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">การวินิจฉัยโรคหลัก (ICD-10)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.diagPrimary}
                    onChange={(e) => setFormData({ ...formData, diagPrimary: e.target.value })}
                    className="w-28 font-mono bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Z480"
                  />
                  <input
                    type="text"
                    value={formData.diagPrimaryName}
                    onChange={(e) => setFormData({ ...formData, diagPrimaryName: e.target.value })}
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="คำอธิบายโรค"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">การวินิจฉัยโรคร่วม (ICD-10)</label>
                <input
                  type="text"
                  value={formData.diagSecondary}
                  onChange={(e) => setFormData({ ...formData, diagSecondary: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Disability Assessment for สปส. 2-19 */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>การประเมินการสูญเสียสมรรถภาพทางร่างกายและจิตใจ (สปส. 2-19)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  ร้อยละการสูญเสียสมรรถภาพของทั้งร่างกาย (WPI %)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.impairmentRate || 0}
                    onChange={(e) => setFormData({ ...formData, impairmentRate: Number(e.target.value) })}
                    className="flex-1 accent-teal-500"
                  />
                  <div className="w-20 px-3 py-1.5 bg-purple-950/80 border border-purple-500/40 rounded-xl text-center font-mono font-bold text-sm text-purple-300">
                    {formData.impairmentRate || 0}%
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ตามคู่มือการประเมินการสูญเสียสมรรถภาพทางกายและจิตใจ สำนักงานประกันสังคม
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ประเภทความพิการ / การสูญเสีย</label>
                <select
                  value={formData.disabilityType || 'สูญเสียสมรรถภาพทั่วไป'}
                  onChange={(e) => setFormData({ ...formData, disabilityType: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="ความพิการทางการเคลื่อนไหวหรือทางร่างกาย">ความพิการทางการเคลื่อนไหวหรือทางร่างกาย</option>
                  <option value="ความพิการทางการมองเห็น/จอประสาทตา">ความพิการทางการมองเห็น/จอประสาทตา</option>
                  <option value="ความพิการทางการได้ยินหรือสื่อความหมาย">ความพิการทางการได้ยินหรือสื่อความหมาย</option>
                  <option value="ความพิการทางจิตใจหรือพฤติกรรม">ความพิการทางจิตใจหรือพฤติกรรม</option>
                  <option value="ความพิการทางระบบประสาท/หลอดเลือดสมอง">ความพิการทางระบบประสาท/หลอดเลือดสมอง</option>
                  <option value="สูญเสียสมรรถภาพทั่วไป">สูญเสียสมรรถภาพทั่วไป</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                ความเห็นของแพทย์ผู้ประเมิน / สรุปผลความสูญเสีย (ที่จะพิมพ์ลงในแบบฟอร์ม สปส. 2-19)
              </label>
              <textarea
                rows={3}
                value={formData.assessmentNote}
                onChange={(e) => setFormData({ ...formData, assessmentNote: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">แพทย์ผู้ประเมิน</label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">เลขที่ใบประกอบวิชาชีพ (ว.)</label>
                <input
                  type="text"
                  value={formData.doctorLicense}
                  onChange={(e) => setFormData({ ...formData, doctorLicense: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">วันที่ลงนามประเมิน</label>
                <input
                  type="date"
                  value={formData.evaluatedAt}
                  onChange={(e) => setFormData({ ...formData, evaluatedAt: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Per-Patient Medical Record / Prescription / Medical Certificate PDF Attachments */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" />
                  <span>เอกสารแนบ PDF ประจำตัวผู้ป่วย ({formData.medicalRecords?.length || 0} ไฟล์)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  แนบไฟล์ PDF เวชระเบียน, ใบสั่งยา, และใบรับรองแพทย์ของ <b>{formData.fullName}</b>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={handleUploadMedicalPdf}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingPdf}
                  onClick={() => triggerCategoryUpload('medical_record')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ PDF เวชระเบียน</span>
                </button>
                <button
                  type="button"
                  disabled={isUploadingPdf}
                  onClick={() => triggerCategoryUpload('prescription')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ PDF ใบสั่งยา</span>
                </button>
                <button
                  type="button"
                  disabled={isUploadingPdf}
                  onClick={() => triggerCategoryUpload('medical_certificate')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ PDF ใบรับรองแพทย์</span>
                </button>
                <button
                  type="button"
                  disabled={isUploadingPdf}
                  onClick={() => triggerCategoryUpload('treatment_record')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ PDF ใบบันทึกการรับรักษา</span>
                </button>
                <button
                  type="button"
                  disabled={isUploadingPdf}
                  onClick={() => triggerCategoryUpload('sso_document')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ PDF เอกสารปกส.</span>
                </button>
              </div>
            </div>

            {(!formData.medicalRecords || formData.medicalRecords.length === 0) ? (
              <div
                onClick={() => triggerCategoryUpload('medical_record')}
                className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/50 bg-slate-950/40 hover:bg-emerald-950/10 rounded-2xl p-6 text-center cursor-pointer transition"
              >
                <Upload className="w-7 h-7 text-slate-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">
                  ยังไม่มีเอกสาร PDF แนบสำหรับ {formData.fullName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  กดปุ่มด้านบนเพื่อแนบ ไฟล์ PDF เวชระเบียน, ใบสั่งยา, ใบรับรองแพทย์ หรือ เอกสารปกส.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.medicalRecords.map((rec) => {
                  const isPreviewOpen = activePreviewRecordId === rec.id;
                  const fileUrl = api.getMedicalRecordUrl(formData.id, rec.id, false);
                  const downloadUrl = api.getMedicalRecordUrl(formData.id, rec.id, true);
                  const cat = rec.category || 'medical_record';
                  const catLabel =
                    cat === 'prescription'
                      ? 'ใบสั่งยา'
                      : cat === 'medical_certificate'
                        ? 'ใบรับรองแพทย์'
                        : cat === 'sso_document'
                          ? 'เอกสารปกส.'
                          : cat === 'treatment_record'
                            ? 'ใบบันทึกการรับรักษา'
                            : 'เวชระเบียน';
                  const catBadgeClass =
                    cat === 'prescription'
                      ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                      : cat === 'medical_certificate'
                        ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                        : cat === 'sso_document'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          : cat === 'treatment_record'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';

                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catBadgeClass}`}>
                                {catLabel}
                              </span>
                              {(cat === 'sso_document' || cat === 'treatment_record') && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-950/60 text-teal-300 border border-teal-500/30">
                                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                                  <span>ประจำตัวถาวร</span>
                                </span>
                              )}
                              <span className="truncate">{rec.originalName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(rec.size)}</span>
                              {rec.pageCount && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-medium">{rec.pageCount} หน้า</span>
                                </>
                              )}
                              <span>•</span>
                              <span>อัปโหลดเมื่อ {new Date(rec.uploadedAt).toLocaleString('th-TH')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setActivePreviewRecordId(isPreviewOpen ? null : rec.id)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                              isPreviewOpen
                                ? 'bg-teal-600 text-white border-teal-500'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isPreviewOpen ? 'ซ่อนตัวอย่าง' : 'ดูไฟล์'}</span>
                          </button>

                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                            title="เปิดในแท็บใหม่"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <a
                            href={downloadUrl}
                            download
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-200 rounded-lg border border-slate-700 transition"
                            title="ดาวน์โหลดไฟล์ PDF เวชระเบียนนี้"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteMedicalPdf(rec.id, rec.originalName, cat === 'sso_document' || cat === 'treatment_record')}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 rounded-lg border border-rose-500/30 transition"
                            title="ลบไฟล์เวชระเบียน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isPreviewOpen && (
                        <div className="border-t border-slate-800 bg-slate-950 p-2 h-96">
                          <iframe
                            src={`${fileUrl}#view=FitH`}
                            className="w-full h-full rounded-lg border border-slate-800 bg-slate-900"
                            title={rec.originalName}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-teal-400" />
            <span>ข้อมูลจะถูกนำไปกรอกลงช่องว่างใน สปส. 2-19 โดยอัตโนมัติ</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onOpenPdf(formData)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
            >
              <FileText className="w-4 h-4" />
              <span>สร้าง & ดูฟอร์ม PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-900/40 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Modern Delete Confirmation Modal */}
      {pendingDeleteRecord && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeletingPdf && setPendingDeleteRecord(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ยืนยันการลบไฟล์เอกสาร PDF</h3>
                  <p className="text-[11px] text-slate-400">
                    ผู้ป่วย: <span className="text-teal-300 font-semibold">{formData.fullName}</span> (HN: {formData.hn})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeletingPdf}
                onClick={() => setPendingDeleteRecord(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {pendingDeleteRecord.fileName}
                </span>
              </div>

              <p className="text-xs text-slate-300">
                คุณต้องการลบไฟล์เอกสารนี้ออกจากเวชระเบียนของ <b>{formData.fullName}</b> ใช่หรือไม่?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/60">
              <button
                type="button"
                disabled={isDeletingPdf}
                onClick={() => setPendingDeleteRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingPdf}
                onClick={confirmDeleteMedicalPdf}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition disabled:opacity-50"
              >
                {isDeletingPdf ? (
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
