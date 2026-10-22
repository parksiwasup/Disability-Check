import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { PatientRecord } from '../types';
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
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setFormData({ ...patient });
  }, [patient]);

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
    </div>
  );
};
