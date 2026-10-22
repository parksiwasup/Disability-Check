import React, { useState } from 'react';
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
  Type
} from 'lucide-react';
import { PatientRecord } from '../types';
import { api } from '../api/client';

interface PatientTableProps {
  patients: PatientRecord[];
  onSelectPatient: (patient: PatientRecord) => void;
  onPreviewPdf: (patient: PatientRecord) => void;
  onOpenWordStudio?: (patient: PatientRecord) => void;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  onSelectPatient,
  onPreviewPdf,
  onOpenWordStudio
}) => {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

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

  const handleDownload = (e: React.MouseEvent, patient: PatientRecord) => {
    e.stopPropagation();
    window.open(api.getPdfDownloadUrl(patient.id), '_blank');
  };

  return (
    <div className="space-y-4">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">HN / VN</th>
                <th className="py-3.5 px-4">ผู้ขอรับการประเมิน</th>
                <th className="py-3.5 px-4">แผนก / วันที่ตรวจ</th>
                <th className="py-3.5 px-4">อาการสำคัญ & การวินิจฉัย (ICD-10)</th>
                <th className="py-3.5 px-4 text-center">สูญเสียสมรรถภาพ</th>
                <th className="py-3.5 px-4 text-center">สิทธิ์การรักษา</th>
                <th className="py-3.5 px-4 text-right">ดำเนินการ (สปส. 2-19)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-normal">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-teal-300 text-xs">
                        {patient.hn}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        VN: {patient.vn}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                        <span>{patient.fullName}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>ID: {patient.idCard}</span>
                        {patient.phone !== '-' && (
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Phone className="w-3 h-3 text-slate-500" /> {patient.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300">
                        {patient.department}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{patient.treatmentDate}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-slate-200 line-clamp-1" title={patient.chiefComplaint}>
                        {patient.chiefComplaint}
                      </div>
                      <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-0.5">
                        <span className="font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
                          {patient.diagPrimary}
                        </span>
                        <span className="text-[11px] font-normal text-slate-400 truncate">
                          {patient.diagPrimaryName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-950/50 border border-purple-500/30 text-purple-300">
                        <Activity className="w-3 h-3 text-purple-400" />
                        <span>{patient.impairmentRate || 0}% WPI</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal-950/50 border border-teal-500/30 text-teal-300">
                        {patient.hospRight.includes('สปส.2-19') ? 'สปส. 2-19' : patient.hospRight}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          id={`btn-view-${patient.hn}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(patient);
                          }}
                          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                          title="ดูรายละเอียดเวชระเบียน"
                        >
                          <Eye className="w-4 h-4" />
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
                            <Type className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          id={`btn-preview-pdf-${patient.hn}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewPdf(patient);
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-teal-900/50 transition"
                          title="สร้างและดูตัวอย่าง สปส. 2-19"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>สร้าง สปส.2-19</span>
                        </button>

                        <button
                          id={`btn-download-pdf-${patient.hn}`}
                          onClick={(e) => handleDownload(e, patient)}
                          className="p-1.5 text-teal-400 hover:text-teal-200 bg-teal-950/40 hover:bg-teal-900/40 rounded-lg border border-teal-500/30 transition"
                          title="ดาวน์โหลด PDF ทันที"
                        >
                          <Download className="w-4 h-4" />
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
    </div>
  );
};
