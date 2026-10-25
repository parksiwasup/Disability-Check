import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../config/db';
import { thaiBahtText } from '../utils/thaiBaht';

export type MedicalDocumentCategory = 'medical_record' | 'prescription' | 'medical_certificate' | 'sso_document';

export interface MedicalRecordAttachment {
  id: string;
  category?: MedicalDocumentCategory;
  isPermanent?: boolean;
  patientHn?: string;
  patientVn?: string;
  patientIdCard?: string;
  patientName?: string;
  fileName: string;
  originalName: string;
  size: number;
  pageCount?: number;
  uploadedAt: string;
  url: string;
}

export interface PatientRecord {
  id: string;
  orderNo: number;
  hn: string;
  vn: string;
  idCard: string;
  fullName: string;
  phone: string;
  nationality: string;
  treatmentDate: string;
  treatmentTime: string;
  visitType: string;
  department: string;
  clinicRoom: string;
  chiefComplaint: string;
  diagPrimary: string;
  diagPrimaryName: string;
  diagSecondary: string;
  diagSecondaryName: string;
  hospRight: string;
  status: string;
  cost: number;
  costText: string;
  impairmentRate: number;
  disabilityType: string;
  assessmentNote: string;
  doctorName: string;
  doctorLicense: string;
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  medicalRecords?: MedicalRecordAttachment[];
}

// ICD-10 Common Thai Disability Descriptions
const ICD_DESCRIPTIONS: Record<string, string> = {
  'Z480': 'การดูแลติดตามหลังการผ่าตัด (Follow-up care)',
  'Z099': 'การตรวจติดตามผลหลังการรักษาภาวะอื่นๆ',
  'K0539': 'โรคปริทันต์อักเสบเรื้อรัง (Chronic periodontitis)',
  'Z012': 'การตรวจสุขภาพฟัน',
  'E113': 'เบาหวานชนิดที่ 2 ร่วมกับภาวะแทรกซ้อนทางตา (Diabetic Retinopathy)',
  'H3600': 'จอประสาทตาเสื่อมจากเบาหวาน',
  'E785': 'ไขมันในเลือดสูงไม่ระบุรายละเอียด',
  'I693': 'ผลตามหลังโรคหลอดเลือดสมองอุดตัน (Sequelae of cerebral infarction)',
  'G409': 'โรคลมชักไม่ระบุรายละเอียด (Epilepsy, unspecified)',
  'S069': 'การบาดเจ็บในกะโหลกศีรษะ (Traumatic Brain Injury)',
  'M545': 'อาการปวดหลังส่วนล่างรุนแรงเรื้อรัง (Chronic Low Back Pain)'
};

function excelDateToDate(excelDate: any): string {
  if (!excelDate) return new Date().toISOString().split('T')[0];
  if (typeof excelDate === 'number') {
    const utc_days = Math.floor(excelDate - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  return String(excelDate);
}

let patientsStore: PatientRecord[] = [];

const MEDICAL_RECORDS_DIR = path.resolve(__dirname, '../../assets/medical-records');
const MEDICAL_RECORDS_INDEX_PATH = path.join(MEDICAL_RECORDS_DIR, 'index.json');

function ensureMedicalRecordsDir() {
  if (!fs.existsSync(MEDICAL_RECORDS_DIR)) {
    fs.mkdirSync(MEDICAL_RECORDS_DIR, { recursive: true });
  }
}

function loadMedicalRecordsIndex(): Record<string, MedicalRecordAttachment[]> {
  try {
    ensureMedicalRecordsDir();
    if (fs.existsSync(MEDICAL_RECORDS_INDEX_PATH)) {
      const raw = fs.readFileSync(MEDICAL_RECORDS_INDEX_PATH, 'utf-8');
      return JSON.parse(raw) || {};
    }
  } catch (err) {
    console.error('[patientRepository] Failed to read medical records index:', err);
  }
  return {};
}

function saveMedicalRecordsIndex(index: Record<string, MedicalRecordAttachment[]>) {
  try {
    ensureMedicalRecordsDir();
    fs.writeFileSync(MEDICAL_RECORDS_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
  } catch (err) {
    console.error('[patientRepository] Failed to save medical records index:', err);
  }
}

function normalizeHn(hn?: string): string {
  return String(hn || '').trim().replace(/^0+/, '');
}

function getRecordsForPatientFromIndex(
  patient: PatientRecord,
  index: Record<string, MedicalRecordAttachment[]>
): MedicalRecordAttachment[] {
  const normHn = normalizeHn(patient.hn);
  const cleanIdCard = String(patient.idCard || '').replace(/\D/g, '');
  const currentVn = String(patient.vn || '').trim();

  const seenIds = new Set<string>();
  const result: MedicalRecordAttachment[] = [];

  for (const [key, list] of Object.entries(index)) {
    const keyNormHn = normalizeHn(key);
    for (const item of list) {
      if (seenIds.has(item.id)) continue;
      const cat = item.category || 'medical_record';
      const isPerm = cat === 'medical_record' || cat === 'sso_document';
      const itemNormHn = normalizeHn(item.patientHn);
      const itemIdCard = String(item.patientIdCard || '').replace(/\D/g, '');
      const itemVn = String(item.patientVn || '').trim();

      const matchesByHn =
        key === patient.hn ||
        key === patient.id ||
        (normHn !== '' && (keyNormHn === normHn || itemNormHn === normHn));
      const matchesByIdCard = cleanIdCard !== '' && itemIdCard !== '' && cleanIdCard === itemIdCard;

      if (isPerm) {
        // Permanent files (เวชระเบียน & เอกสารปกส.) ALWAYS follow the person across all visits in the month/forever
        if (matchesByHn || matchesByIdCard) {
          seenIds.add(item.id);
          result.push({
            ...item,
            category: cat,
            isPermanent: true,
            url: `/api/patients/${encodeURIComponent(patient.id)}/medical-records/${encodeURIComponent(item.id)}`
          });
        }
      } else {
        // Visit-specific files (ใบสั่งยา & ใบรับรองแพทย์): match the person AND (if VN recorded) that specific visit VN
        const vnMatches = !itemVn || !currentVn || itemVn === currentVn;
        if (matchesByHn && vnMatches) {
          seenIds.add(item.id);
          result.push({
            ...item,
            category: cat,
            isPermanent: false,
            url: `/api/patients/${encodeURIComponent(patient.id)}/medical-records/${encodeURIComponent(item.id)}`
          });
        }
      }
    }
  }

  return result;
}

function attachMedicalRecords(patient: PatientRecord): PatientRecord {
  const index = loadMedicalRecordsIndex();
  const records = getRecordsForPatientFromIndex(patient, index);
  return {
    ...patient,
    medicalRecords: records
  };
}

export function loadExcelData(filePath?: string): PatientRecord[] {
  const targetPath = filePath || path.resolve(__dirname, '../../assets/data.xlsx');
  const fallbackPath = path.resolve(__dirname, '../../../ทดสอบทุพพลภาพ.xlsx');
  
  const finalPath = fs.existsSync(targetPath) ? targetPath : fallbackPath;
  if (!fs.existsSync(finalPath)) {
    console.warn('Excel file not found at:', finalPath);
    return patientsStore;
  }

  try {
    const workbook = xlsx.readFile(finalPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet);

    const parsed: PatientRecord[] = [];
    rows.forEach((r, idx) => {
      const hn = String(r['HN'] || '').trim();
      const name = String(r['ชื่อ-สกุล'] || '').trim();
      if (!hn || !name) return;

      const diagPrim = String(r['ผลวินิจฉัยหลัก'] || '').trim();
      const diagSec = String(r['ผลวินิจฉัยอื่น'] || '').trim();
      const rawNat = String(r['สัญชาติ'] || 'ไทย');
      const cleanNat = rawNat.includes(':') ? rawNat.split(':')[1] : rawNat;

      let estimatedRate = 0;
      let estCategory = 'สูญเสียสมรรถภาพทั่วไป';
      const complaint = String(r['อาการสำคัญ'] || '');
      
      if (complaint.includes('stroke') || complaint.includes('ลมชัก') || diagPrim.startsWith('I6') || diagPrim.startsWith('G4')) {
        estimatedRate = 45;
        estCategory = 'ความพิการทางกายและการเคลื่อนไหว/ระบบประสาท';
      } else if (complaint.includes('เบาหวาน') || diagPrim.startsWith('E113') || diagSec.includes('H36')) {
        estimatedRate = 35;
        estCategory = 'ความพิการทางการมองเห็น/ภาวะแทรกซ้อนเบาหวาน';
      } else if (complaint.includes('ขาซ้าย') || complaint.includes('ก้น') || complaint.includes('ปวดแผลร้าว')) {
        estimatedRate = 30;
        estCategory = 'ความพิการทางการเคลื่อนไหวหลังผ่าตัด';
      }

      const costValue = Number(r['ค่าใช้จ่าย'] || r['ลูกหนี้เคลม'] || 550);
      const vn = String(r['VN'] || '').trim();
      const baseId = `PAT-${String(r['HN'] || idx + 1).padStart(8, '0')}`;
      const uniqueId = parsed.some(p => p.id === baseId) && vn ? `${baseId}-${vn}` : baseId;

      parsed.push({
        id: uniqueId,
        orderNo: Number(r['ลำดับ']) || (idx + 1),
        hn: hn,
        vn: vn,
        idCard: String(r['เลขบัตรประชาชน'] || '').replace(/\D/g, '').trim(),
        fullName: name,
        phone: String(r['เบอร์มือถือ'] || r['เบอร์บ้าน'] || r['เบอร์ผู้ติดต่อ'] || '-').trim(),
        nationality: cleanNat,
        treatmentDate: excelDateToDate(r['วันที่รักษา']),
        treatmentTime: String(r['เวลา'] || '09:00:00').trim(),
        visitType: String(r['ประเภทการมา'] || 'มาตามนัด').trim(),
        department: String(r['แผนก'] || 'เวชศาสตร์ฟื้นฟู').trim(),
        clinicRoom: String(r['ห้องตรวจ'] || '-').trim(),
        chiefComplaint: complaint || '-',
        diagPrimary: diagPrim || '-',
        diagPrimaryName: ICD_DESCRIPTIONS[diagPrim] || 'การตรวจประเมินภาวะการสูญเสียสมรรถภาพ',
        diagSecondary: diagSec || '-',
        diagSecondaryName: ICD_DESCRIPTIONS[diagSec] || '-',
        hospRight: String(r['ชื่อสิทธิHOSxP'] || 'ประกันสังคมทุพลภาพ(สปส.2-19)').trim(),
        status: String(r['สถานะหลังตรวจ'] || 'ตรวจแล้ว').trim(),
        cost: costValue,
        costText: thaiBahtText(costValue),
        impairmentRate: estimatedRate,
        disabilityType: estCategory,
        assessmentNote: `ผู้ป่วยได้รับการตรวจวินิจฉัยและวางแผนส่งรายงาน สปส. 2-19 สำหรับสิทธิประโยชน์ทดแทนกรณีทุพพลภาพ`,
        doctorName: process.env.DEFAULT_DOCTOR || 'นพ. ธีรภัทร เวชศาสตร์ฟื้นฟู',
        doctorLicense: process.env.DEFAULT_LICENSE || 'ว. 45892',
        evaluatedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    patientsStore = parsed;
    console.log(`Loaded ${patientsStore.length} patient records from Excel.`);
    return patientsStore;
  } catch (err) {
    console.error('Error reading Excel data:', err);
    return patientsStore;
  }
}

// Initial load
loadExcelData();

export const patientRepository = {
  getAll(filter?: { search?: string; department?: string; status?: string }): PatientRecord[] {
    let result = patientsStore.map(attachMedicalRecords);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.hn.toLowerCase().includes(q) ||
        p.idCard.includes(q) ||
        p.chiefComplaint.toLowerCase().includes(q) ||
        p.diagPrimary.toLowerCase().includes(q)
      );
    }
    if (filter?.department && filter.department !== 'all') {
      result = result.filter(p => p.department === filter.department);
    }
    if (filter?.status && filter.status !== 'all') {
      result = result.filter(p => p.status === filter.status);
    }
    return result;
  },

  getById(id: string): PatientRecord | undefined {
    const found = patientsStore.find(p => p.id === id || p.hn === id);
    return found ? attachMedicalRecords(found) : undefined;
  },

  update(id: string, updates: Partial<PatientRecord>): PatientRecord | null {
    const idx = patientsStore.findIndex(p => p.id === id || p.hn === id);
    if (idx === -1) return null;
    
    if (updates.cost !== undefined) {
      updates.costText = thaiBahtText(updates.cost);
    }

    const { medicalRecords, ...restUpdates } = updates;

    patientsStore[idx] = {
      ...patientsStore[idx],
      ...restUpdates,
      updatedAt: new Date().toISOString()
    };
    return attachMedicalRecords(patientsStore[idx]);
  },

  create(record: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt'>): PatientRecord {
    const newRecord: PatientRecord = {
      ...record,
      id: `PAT-${Date.now()}`,
      costText: thaiBahtText(record.cost || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    patientsStore.unshift(newRecord);
    return attachMedicalRecords(newRecord);
  },

  async addMedicalRecords(
    id: string,
    files: Array<{ buffer: Buffer; originalname: string; size: number }>,
    category: MedicalDocumentCategory = 'medical_record'
  ): Promise<PatientRecord | null> {
    const patient = patientsStore.find(p => p.id === id || p.hn === id);
    if (!patient) return null;

    ensureMedicalRecordsDir();
    const index = loadMedicalRecordsIndex();
    const key = patient.hn || patient.id;
    const list: MedicalRecordAttachment[] = index[key] || [];

    const validCategory: MedicalDocumentCategory =
      category === 'prescription' || category === 'medical_certificate' || category === 'sso_document'
        ? category
        : 'medical_record';

    for (const file of files) {
      // Decode UTF-8 original filename if multer parsed it as latin1
      let decodedName = file.originalname;
      try {
        const candidate = Buffer.from(file.originalname, 'latin1').toString('utf8');
        if (!candidate.includes('\ufffd')) {
          decodedName = candidate;
        }
      } catch {
        // keep originalname
      }

      const recId = `MR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const safeHn = String(patient.hn || patient.id).replace(/[^a-zA-Z0-9_-]/g, '');
      const storedFileName = `${safeHn}_${recId}.pdf`;
      const fullPath = path.join(MEDICAL_RECORDS_DIR, storedFileName);

      fs.writeFileSync(fullPath, file.buffer);

      let pageCount: number | undefined;
      try {
        const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } catch {
        // Ignore if page count cannot be read
      }

      const isPermanentCategory = validCategory === 'medical_record' || validCategory === 'sso_document';

      const attachment: MedicalRecordAttachment = {
        id: recId,
        category: validCategory,
        isPermanent: isPermanentCategory,
        patientHn: patient.hn,
        patientVn: isPermanentCategory ? undefined : patient.vn,
        patientIdCard: patient.idCard,
        patientName: patient.fullName,
        fileName: storedFileName,
        originalName: decodedName.endsWith('.pdf') || decodedName.endsWith('.PDF') ? decodedName : `${decodedName}.pdf`,
        size: file.size || file.buffer.length,
        pageCount,
        uploadedAt: new Date().toISOString(),
        url: `/api/patients/${encodeURIComponent(patient.id)}/medical-records/${encodeURIComponent(recId)}`
      };

      list.push(attachment);
    }

    index[key] = list;
    saveMedicalRecordsIndex(index);

    return attachMedicalRecords(patient);
  },

  deleteMedicalRecord(id: string, recordId: string): PatientRecord | null {
    const patient = patientsStore.find(p => p.id === id || p.hn === id);
    if (!patient) return null;

    const index = loadMedicalRecordsIndex();
    for (const [k, list] of Object.entries(index)) {
      const target = list.find(r => r.id === recordId);
      if (target) {
        const fullPath = path.join(MEDICAL_RECORDS_DIR, target.fileName);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (err) {
            console.error('[patientRepository] Failed to delete medical record file:', err);
          }
        }
        index[k] = list.filter(r => r.id !== recordId);
        saveMedicalRecordsIndex(index);
        break;
      }
    }

    return attachMedicalRecords(patient);
  },

  getMedicalRecordFile(id: string, recordId: string): { attachment: MedicalRecordAttachment; fullPath: string } | null {
    const patient = patientsStore.find(p => p.id === id || p.hn === id);
    if (!patient) return null;

    const index = loadMedicalRecordsIndex();
    const list = getRecordsForPatientFromIndex(patient, index);
    const target = list.find(r => r.id === recordId);
    if (!target) return null;

    const fullPath = path.join(MEDICAL_RECORDS_DIR, target.fileName);
    if (!fs.existsSync(fullPath)) return null;

    return { attachment: target, fullPath };
  },

  getAllMedicalRecordPathsForPatient(patient: PatientRecord): string[] {
    const index = loadMedicalRecordsIndex();
    const list = getRecordsForPatientFromIndex(patient, index);
    const paths: string[] = [];
    for (const item of list) {
      const fullPath = path.join(MEDICAL_RECORDS_DIR, item.fileName);
      if (fs.existsSync(fullPath)) {
        paths.push(fullPath);
      }
    }
    return paths;
  },

  delete(id: string): boolean {
    const prevLen = patientsStore.length;
    patientsStore = patientsStore.filter(p => p.id !== id && p.hn !== id);
    return patientsStore.length < prevLen;
  },

  importBuffer(buffer: Buffer): number {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet);

    let addedCount = 0;
    rows.forEach((r, idx) => {
      const hn = String(r['HN'] || '').trim();
      const name = String(r['ชื่อ-สกุล'] || '').trim();
      if (!hn || !name) return;

      const vn = String(r['VN'] || '').trim();
      const existingIdx = patientsStore.findIndex(p => p.hn === hn && ( !vn || p.vn === vn ));
      const diagPrim = String(r['ผลวินิจฉัยหลัก'] || '').trim();
      const costValue = Number(r['ค่าใช้จ่าย'] || r['ลูกหนี้เคลม'] || 550);
      const baseId = `PAT-${String(hn).padStart(8, '0')}`;
      const uniqueId =
        existingIdx >= 0
          ? patientsStore[existingIdx].id
          : patientsStore.some(p => p.id === baseId) && vn
            ? `${baseId}-${vn}`
            : baseId;

      const record: PatientRecord = {
        id: uniqueId,
        orderNo: Number(r['ลำดับ']) || (patientsStore.length + 1),
        hn,
        vn,
        idCard: String(r['เลขบัตรประชาชน'] || '').replace(/\D/g, '').trim(),
        fullName: name,
        phone: String(r['เบอร์มือถือ'] || r['เบอร์บ้าน'] || '-').trim(),
        nationality: String(r['สัญชาติ'] || 'ไทย').replace(/^\d+:/, ''),
        treatmentDate: excelDateToDate(r['วันที่รักษา']),
        treatmentTime: String(r['เวลา'] || '09:00:00').trim(),
        visitType: String(r['ประเภทการมา'] || 'มาตามนัด').trim(),
        department: String(r['แผนก'] || 'ทั่วไป').trim(),
        clinicRoom: String(r['ห้องตรวจ'] || '-').trim(),
        chiefComplaint: String(r['อาการสำคัญ'] || '-').trim(),
        diagPrimary: diagPrim,
        diagPrimaryName: ICD_DESCRIPTIONS[diagPrim] || 'การตรวจประเมินภาวะสูญเสียสมรรถภาพ',
        diagSecondary: String(r['ผลวินิจฉัยอื่น'] || '-').trim(),
        diagSecondaryName: ICD_DESCRIPTIONS[String(r['ผลวินิจฉัยอื่น'] || '')] || '-',
        hospRight: String(r['ชื่อสิทธิHOSxP'] || 'ประกันสังคมทุพลภาพ(สปส.2-19)').trim(),
        status: String(r['สถานะหลังตรวจ'] || 'ตรวจแล้ว').trim(),
        cost: costValue,
        costText: thaiBahtText(costValue),
        impairmentRate: 35,
        disabilityType: 'การประเมินสูญเสียสมรรถภาพ',
        assessmentNote: 'นำเข้าจากไฟล์ Excel',
        doctorName: process.env.DEFAULT_DOCTOR || 'นพ. ธีรภัทร เวชศาสตร์ฟื้นฟู',
        doctorLicense: process.env.DEFAULT_LICENSE || 'ว. 45892',
        evaluatedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        patientsStore[existingIdx] = { ...patientsStore[existingIdx], ...record };
      } else {
        patientsStore.push(record);
        addedCount++;
      }
    });

    return addedCount;
  },

  getStats() {
    const total = patientsStore.length;
    const evaluated = patientsStore.filter(p => p.status === 'ตรวจแล้ว' || p.status === 'ประเมินแล้ว').length;
    const pending = total - evaluated;
    
    const deptMap: Record<string, number> = {};
    patientsStore.forEach(p => {
      const d = p.department || 'อื่นๆ';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });

    const diagMap: Record<string, number> = {};
    patientsStore.forEach(p => {
      const d = p.diagPrimary || 'ไม่ระบุ';
      diagMap[d] = (diagMap[d] || 0) + 1;
    });

    const avgImpairment = total > 0 
      ? Math.round(patientsStore.reduce((acc, p) => acc + (p.impairmentRate || 0), 0) / total) 
      : 0;

    return {
      total,
      evaluated,
      pending,
      avgImpairment,
      departments: deptMap,
      diagnoses: diagMap
    };
  }
};
