import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PatientRecord, patientRepository } from './patientRepository';
import { thaiBahtText, formatThaiCurrencyNumeric } from '../utils/thaiBaht';

export interface FieldConfig {
  id: string;
  label: string;
  section: string;
  key: keyof PatientRecord | string;
  page: number;
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string; // 'THSarabunNew' | 'Tahoma' | 'Cordia'
  isBold?: boolean;
  color?: string; // Hex color e.g. '#000000' or '#081d38'
  customText?: string;
  prefix?: string;
  suffix?: string;
  format?: (val: any, patient: PatientRecord) => string;
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function parseDateComponents(dateStr: string) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    return { day, month, year };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
}

function formatThaiDateShort(dateStr: string): string {
  const comp = parseDateComponents(dateStr);
  if (!comp) return String(dateStr || '');
  const thaiYear = comp.year + 543;
  return `${comp.day} ${THAI_MONTHS_SHORT[comp.month] || 'ก.ย.'} ${thaiYear}`;
}

function getThaiDateParts(dateStr: string): { day: string; monthFull: string; monthShort: string; year: string } {
  const comp = parseDateComponents(dateStr);
  if (!comp) {
    return { day: '9', monthFull: 'กันยายน', monthShort: 'ก.ย.', year: '2569' };
  }
  return {
    day: String(comp.day),
    monthFull: THAI_MONTHS_FULL[comp.month] || 'กันยายน',
    monthShort: THAI_MONTHS_SHORT[comp.month] || 'ก.ย.',
    year: String(comp.year + 543)
  };
}

function hexToRgb(hex = '#081d38') {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0.03;
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0.12;
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0.28;
  return rgb(r, g, b);
}

// Draw an authentic Thai official checkmark [✓] centered inside the 9x11.4pt checkbox (100% reliable on all printers)
function drawCheckmark(page: any, x: number, y: number, color = rgb(0.04, 0.16, 0.38)) {
  page.drawLine({
    start: { x: x + 2.0, y: y + 5.6 },
    end: { x: x + 3.9, y: y + 3.2 },
    thickness: 1.35,
    color
  });
  page.drawLine({
    start: { x: x + 3.9, y: y + 3.2 },
    end: { x: x + 7.2, y: y + 8.6 },
    thickness: 1.35,
    color
  });
}

// Detect patient title prefix ('mr' | 'mrs' | 'miss') and return strikeout targets for (นาย, นาง, นางสาว)
export function getTitleStrikeTargets(fullName: string): Array<'mr' | 'mrs' | 'miss'> {
  const name = String(fullName || '').trim();
  if (/^(นางสาว|น\.ส\.|นส\.|ด\.ญ\.|เด็กหญิง)/.test(name)) {
    // Keep นางสาว -> strike out นาย and นาง
    return ['mr', 'mrs'];
  }
  if (/^นาง(?!สาว)/.test(name)) {
    // Keep นาง -> strike out นาย and นางสาว
    return ['mr', 'miss'];
  }
  if (/^(นาย|ด\.ช\.|เด็กชาย|ร\.ต\.|จ\.ส\.|ส\.ต\.|พ\.ต\.|พ\.ท\.|พ\.อ\.)/.test(name)) {
    // Keep นาย -> strike out นาง and นางสาว
    return ['mrs', 'miss'];
  }
  return [];
}

// Strip prefix (นาย, นาง, นางสาว, น.ส., ฯลฯ) when filling after (นาย, นาง, นางสาว)
export function stripThaiTitlePrefix(fullName: string): string {
  return String(fullName || '')
    .trim()
    .replace(/^(นางสาว|น\.ส\.|นส\.|นาง|นาย|ด\.ช\.|เด็กชาย|ด\.ญ\.|เด็กหญิง)\s*/, '')
    .trim();
}

// Draw clean strikeout lines across unused titles in "ข้าพเจ้า (นาย, นาง, นางสาว)" at y=235.61
function drawTitleStrikeouts(page: any, fullName: string, color = rgb(0.04, 0.16, 0.38)) {
  const targets = getTitleStrikeTargets(fullName);
  if (targets.length === 0) return;

  // Exact vector coordinates of (นาย, นาง, นางสาว) on Form สปส. 2-19 (y=235.61, 15pt TH Sarabun New)
  const TITLE_BOXES: Record<'mr' | 'mrs' | 'miss', { x1: number; x2: number }> = {
    mr:   { x1: 110.0, x2: 128.0 }, // "นาย"
    mrs:  { x1: 132.5, x2: 149.0 }, // "นาง"
    miss: { x1: 153.5, x2: 185.5 }  // "นางสาว"
  };

  const lineY = 239.2; // Middle of Thai characters on baseline y=235.61
  for (const t of targets) {
    const box = TITLE_BOXES[t];
    if (box) {
      page.drawLine({
        start: { x: box.x1, y: lineY },
        end: { x: box.x2, y: lineY },
        thickness: 1.15,
        color
      });
    }
  }
}

/**
 * Intelligent Thai text splitter for official government forms.
 * Splits long text gracefully across Dotted Line 1 and Dotted Line 2 without cutting words awkwardly.
 */
export function splitThaiTextLines(text: string, maxLine1Chars: number = 65): { line1: string; line2: string } {
  if (!text) return { line1: '', line2: '' };

  // If text already has newline, respect it
  if (text.includes('\n')) {
    const lines = text.split('\n');
    return {
      line1: lines[0].trim(),
      line2: lines.slice(1).join(' ').trim()
    };
  }

  // If text is short enough to fit on Line 1
  if (text.length <= maxLine1Chars) {
    return { line1: text.trim(), line2: '' };
  }

  // Look for natural break points near maxLine1Chars (range between 30 and maxLine1Chars + 10)
  const minSplit = Math.max(30, maxLine1Chars - 25);
  const maxSplit = Math.min(text.length - 1, maxLine1Chars + 10);
  const searchWindow = text.slice(minSplit, maxSplit);

  let bestRelativeIdx = -1;
  const delimiters = ['/', ' และ ', ' ', ' หรือ ', ',', ';', '-'];

  for (const delim of delimiters) {
    const idx = searchWindow.lastIndexOf(delim);
    if (idx !== -1) {
      const splitAt = delim === '/' ? idx + 1 : (delim.startsWith(' ') ? idx : idx + delim.length);
      if (splitAt > bestRelativeIdx) {
        bestRelativeIdx = splitAt;
      }
    }
  }

  let splitIndex = maxLine1Chars;
  if (bestRelativeIdx !== -1) {
    splitIndex = minSplit + bestRelativeIdx;
  } else {
    const spaceIdx = text.slice(0, maxLine1Chars).lastIndexOf(' ');
    if (spaceIdx > 30) {
      splitIndex = spaceIdx;
    }
  }

  const line1 = text.slice(0, splitIndex).trim();
  const line2 = text.slice(splitIndex).trim();

  return { line1, line2 };
}

// Global font and coordinate mappings with standard Thai fonts (TH Sarabun New)
const initialDefaultFieldMappings: FieldConfig[] = [
  // ข้อ 1: ชื่อสถานพยาบาล
  {
    id: 'hospName',
    label: '1. ชื่อสถานพยาบาล',
    section: 'ข้อ 1',
    key: 'hospName',
    page: 1,
    x: 132,
    y: 689.5,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: () => process.env.HOSPITAL_NAME || 'โรงพยาบาลศูนย์การแพทย์เฉพาะทาง'
  },
  // ข้อ 1: ชื่อผู้ประกันตน
  {
    id: 'fullName',
    label: '1. ชื่อผู้ประกันตน',
    section: 'ข้อ 1',
    key: 'fullName',
    page: 1,
    x: 75,
    y: 670.0,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 1: เลขประจำตัวประชาชน (13 หลัก)
  {
    id: 'idCard',
    label: '1. เลขประจำตัวประชาชน (13 หลัก)',
    section: 'ข้อ 1',
    key: 'idCard',
    page: 1,
    x: 413.55,
    y: 672.8,
    fontSize: 12.5,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 3: บรรทัดที่ 1 อาการสำคัญ
  {
    id: 'chiefComplaint',
    label: '3. อาการสำคัญที่เข้ารับบริการ (บรรทัดที่ 1)',
    section: 'ข้อ 3',
    key: 'chiefComplaint',
    page: 1,
    x: 245,
    y: 582.5,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 3: บรรทัดที่ 2 อาการสำคัญ (สำหรับข้อความยาว)
  {
    id: 'chiefComplaintLine2',
    label: '3. อาการสำคัญที่เข้ารับบริการ (บรรทัดที่ 2)',
    section: 'ข้อ 3',
    key: 'chiefComplaint',
    page: 1,
    x: 52.2,
    y: 562.6,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 4: วิธีการรักษาพยาบาล บรรทัดที่ 1
  {
    id: 'treatmentMethod2',
    label: '4. วิธีการรักษาพยาบาล (บรรทัดที่ 1)',
    section: 'ข้อ 4',
    key: 'assessmentNote',
    page: 1,
    x: 148.0,
    y: 541.2,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 4: วิธีการรักษาพยาบาล บรรทัดที่ 2
  {
    id: 'treatmentMethod2Line2',
    label: '4. วิธีการรักษาพยาบาล (บรรทัดที่ 2)',
    section: 'ข้อ 4',
    key: 'assessmentNote',
    page: 1,
    x: 52.2,
    y: 521.7,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 4: วันที่รักษา ตั้งแต่วันที่
  {
    id: 'treatmentDateStart',
    label: '4. ตั้งแต่วันที่',
    section: 'ข้อ 4',
    key: 'treatmentDate',
    page: 1,
    x: 250,
    y: 502.8,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => formatThaiDateShort(val)
  },
  // ข้อ 4: วันที่รักษา ถึงวันที่
  {
    id: 'treatmentDateEnd',
    label: '4. ถึงวันที่',
    section: 'ข้อ 4',
    key: 'treatmentDate',
    page: 1,
    x: 440,
    y: 502.8,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => formatThaiDateShort(val)
  },
  // ข้อ 4: รวมเป็นเงิน (ตัวเลข)
  {
    id: 'costNumeric',
    label: '4. รวมเป็นเงิน (บาท)',
    section: 'ข้อ 4',
    key: 'cost',
    page: 1,
    x: 120,
    y: 483.2,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    format: (val) => formatThaiCurrencyNumeric(val || 550)
  },
  // ข้อ 4: รวมเป็นเงิน (ตัวหนังสือ)
  {
    id: 'costText',
    label: '4. รวมเป็นเงิน (ตัวหนังสือ)',
    section: 'ข้อ 4',
    key: 'costText',
    page: 1,
    x: 315,
    y: 483.2,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val, patient) => patient?.cost !== undefined ? thaiBahtText(Number(patient.cost)) : (val || 'ห้าร้อยห้าสิบเจ็ดบาทถ้วน')
  },
  // ข้อ 6: ผู้อำนวยการโรงพยาบาลในวงเล็บ
  {
    id: 'directorName',
    label: '6. ผู้อำนวยการโรงพยาบาล (ชื่อในวงเล็บ)',
    section: 'ข้อ 6',
    key: 'doctorName',
    page: 1,
    x: 345,
    y: 323.0,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => `( ${val || 'นพ. ธีรภัทร เวชศาสตร์ฟื้นฟู'} )`
  },
  // ข้อ 6: ตำแหน่ง
  {
    id: 'directorPosition',
    label: '6. ตำแหน่ง',
    section: 'ข้อ 6',
    key: 'directorPosition',
    page: 1,
    x: 345,
    y: 303.0,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: () => 'ผู้อำนวยการโรงพยาบาล'
  },
  // ส่วนล่าง: คำรับรองของผู้ประกันตน (ข้าพเจ้า)
  {
    id: 'patientCertifyName',
    label: 'คำรับรอง: ข้าพเจ้า',
    section: 'คำรับรองผู้ประกันตน',
    key: 'fullName',
    page: 1,
    x: 215,
    y: 236.0,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => stripThaiTitlePrefix(String(val || ''))
  },
  // ส่วนล่าง: ลงชื่อผู้ประกันตนในวงเล็บ (บนกระดาษแบบฟอร์มมีวงเล็บพิมพ์มาให้อยู่แล้ว)
  {
    id: 'patientSignName',
    label: 'คำรับรอง: (ชื่อผู้ประกันตน)',
    section: 'คำรับรองผู้ประกันตน',
    key: 'fullName',
    page: 1,
    x: 345,
    y: 175.0,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => String(val || '')
  },
  // ส่วนล่าง: คำรับรอง วันที่ (วัน)
  {
    id: 'certifyDateDay',
    label: 'คำรับรอง: วันที่ (วัน)',
    section: 'คำรับรองผู้ประกันตน',
    key: 'treatmentDate',
    page: 1,
    x: 324,
    y: 156.5,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => getThaiDateParts(val).day
  },
  // ส่วนล่าง: คำรับรอง วันที่ (เดือน)
  {
    id: 'certifyDateMonth',
    label: 'คำรับรอง: วันที่ (เดือน)',
    section: 'คำรับรองผู้ประกันตน',
    key: 'treatmentDate',
    page: 1,
    x: 386,
    y: 156.5,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => getThaiDateParts(val).monthFull
  },
  // ส่วนล่าง: คำรับรอง วันที่ (ปี พ.ศ.)
  {
    id: 'certifyDateYear',
    label: 'คำรับรอง: วันที่ (ปี พ.ศ.)',
    section: 'คำรับรองผู้ประกันตน',
    key: 'treatmentDate',
    page: 1,
    x: 468,
    y: 156.5,
    fontSize: 16,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => getThaiDateParts(val).year
  },
  // ข้อ 1: ติ๊กถูก ประเภทผู้ป่วยนอก
  {
    id: 'check_opd',
    label: '✓ ประเภท: ผู้ป่วยนอก',
    section: 'ข้อ 1',
    key: 'check_opd',
    page: 1,
    x: 204.75,
    y: 649.47,
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    customText: '✓'
  },
  // ข้อ 2: ติ๊กถูก เป็นสถานพยาบาลที่ผู้ทุพพลภาพเลือก
  {
    id: 'check_hospital_choice',
    label: '✓ ข้อมูลสถานพยาบาล: เป็นสถานพยาบาลที่เลือก',
    section: 'ข้อ 2',
    key: 'check_hospital_choice',
    page: 1,
    x: 150.3,
    y: 628.62,
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    customText: '✓'
  },
  // ข้อ 5: ติ๊กถูก ขอรับเงินผ่านธนาคาร
  {
    id: 'check_payment_bank',
    label: '✓ ขอรับเงิน: ธนาคาร',
    section: 'ข้อ 5',
    key: 'check_payment_bank',
    page: 1,
    x: 398.3,
    y: 461.17,
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    customText: '✓'
  },
  // ข้อ 6: ติ๊กถูก ใบรับรองแพทย์
  {
    id: 'check_doc_med_cert',
    label: '✓ เอกสารแนบ: ใบรับรองแพทย์',
    section: 'ข้อ 6',
    key: 'check_doc_med_cert',
    page: 1,
    x: 79.3,
    y: 400.97,
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    customText: '✓'
  },
  // ข้อ 6: ติ๊กถูก ใบสรุป/ใบแสดงรายการค่ารักษาพยาบาล
  {
    id: 'check_doc_summary',
    label: '✓ เอกสารแนบ: ใบสรุป/ใบแสดงรายการค่ารักษา',
    section: 'ข้อ 6',
    key: 'check_doc_summary',
    page: 1,
    x: 79.3,
    y: 381.47,
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    customText: '✓'
  }
];

const MAPPINGS_FILE_PATH = path.resolve(__dirname, '../../assets/mappings.json');

// Helper to load persisted template mappings or initialize with defaults
function loadSavedMappings(defaults: FieldConfig[]): FieldConfig[] {
  try {
    if (fs.existsSync(MAPPINGS_FILE_PATH)) {
      const content = fs.readFileSync(MAPPINGS_FILE_PATH, 'utf-8');
      const saved: FieldConfig[] = JSON.parse(content);
      const legacyCheckCoords: Record<string, { oldX: number; oldY: number; newX: number; newY: number }> = {
        check_opd: { oldX: 206.5, oldY: 650.5, newX: 204.75, newY: 649.47 },
        check_ipd: { oldX: 272.5, oldY: 650.5, newX: 271.75, newY: 649.37 },
        check_hospital_choice: { oldX: 153.5, oldY: 629.5, newX: 150.3, newY: 628.62 },
        check_hospital_not_choice: { oldX: 153.5, oldY: 603.5, newX: 150.3, newY: 604.57 },
        check_payment_bank: { oldX: 395.5, oldY: 461.8, newX: 398.3, newY: 461.17 },
        check_payment_sso: { oldX: 90.5, oldY: 461.8, newX: 91.55, newY: 461.17 },
        check_payment_postal: { oldX: 208.0, oldY: 461.8, newX: 210.05, newY: 461.17 },
        check_doc_med_cert: { oldX: 80.5, oldY: 401.4, newX: 79.3, newY: 400.97 },
        check_doc_summary: { oldX: 80.5, oldY: 382.0, newX: 79.3, newY: 381.47 }
      };
      if (Array.isArray(saved) && saved.length > 0) {
        const defaultMap = new Map(defaults.map(f => [f.id, f]));
        const merged: FieldConfig[] = [];
        for (const item of saved) {
          // Remove accidental hardcoded patient name in template mappings
          if (item.id === 'patientSignName' && (item.customText?.includes('รัสมี') || item.customText?.includes('รัศมี'))) {
            delete item.customText;
          }
          const mig = legacyCheckCoords[item.id];
          if (mig && Math.abs(item.x - mig.oldX) < 0.2 && Math.abs(item.y - mig.oldY) < 0.2) {
            item.x = mig.newX;
            item.y = mig.newY;
          }
          // Migrate legacy certify date X coordinates so Year doesn't overlap the 2nd slash (/) at x=446.8
          if (item.id === 'certifyDateDay' && (item.x === 315 || item.x === 322)) item.x = 324;
          if (item.id === 'certifyDateMonth' && (item.x === 365 || item.x === 375)) item.x = 386;
          if (item.id === 'certifyDateYear' && (item.x === 445 || item.x === 450)) item.x = 468;
          if (item.id === 'costText' && item.x === 360) item.x = 315;
          const def = defaultMap.get(item.id);
          merged.push({
            ...def,
            ...item,
            format: def?.format
          });
          defaultMap.delete(item.id);
        }
        for (const remaining of defaultMap.values()) {
          merged.push(remaining);
        }
        console.log(`[pdfService] Loaded ${merged.length} template field mappings from ${MAPPINGS_FILE_PATH}`);
        return merged;
      }
    } else {
      // First run: persist initial template defaults to disk
      const serializable = defaults.map(({ format, ...rest }) => rest);
      const dir = path.dirname(MAPPINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(serializable, null, 2), 'utf-8');
      console.log(`[pdfService] Initialized template mappings at ${MAPPINGS_FILE_PATH}`);
    }
  } catch (err) {
    console.error('[pdfService] Error loading or initializing saved mappings:', err);
  }
  return defaults;
}

export let defaultFieldMappings: FieldConfig[] = loadSavedMappings(initialDefaultFieldMappings);

export const pdfService = {
  getFieldMappings(): FieldConfig[] {
    defaultFieldMappings = loadSavedMappings(initialDefaultFieldMappings);
    return defaultFieldMappings;
  },

  updateFieldMappings(newMappings: FieldConfig[]): FieldConfig[] {
    const defaultMap = new Map(defaultFieldMappings.map(f => [f.id, f]));
    const full = newMappings.map(m => ({
      ...m,
      format: m.format || defaultMap.get(m.id)?.format
    }));
    defaultFieldMappings = full;

    try {
      const serializable = full.map(({ format, ...rest }) => rest);
      const dir = path.dirname(MAPPINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(serializable, null, 2), 'utf-8');
      console.log(`[pdfService] Auto-saved ${serializable.length} template field mappings to ${MAPPINGS_FILE_PATH}`);
    } catch (err) {
      console.error('[pdfService] Failed to persist mappings.json:', err);
    }

    return defaultFieldMappings;
  },

  async generatePdf(
    patient: PatientRecord,
    customMappings?: FieldConfig[],
    options?: { includeMedicalRecords?: boolean }
  ): Promise<Uint8Array> {
    const templatePath = path.resolve(__dirname, '../../assets/template.pdf');
    const fallbackTemplate = path.resolve(__dirname, '../../../สปส2-19.pdf');
    const actualTemplatePath = fs.existsSync(templatePath) ? templatePath : fallbackTemplate;

    if (!fs.existsSync(actualTemplatePath)) {
      throw new Error(`Template PDF not found at ${actualTemplatePath}`);
    }

    const templateBytes = fs.readFileSync(actualTemplatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);

    // Font Cache
    const loadedFonts: Record<string, any> = {};

    const loadFont = async (name: string, isBold = false) => {
      const cacheKey = `${name}_${isBold ? 'bold' : 'reg'}`;
      if (loadedFonts[cacheKey]) return loadedFonts[cacheKey];

      const fontsDir = path.resolve(__dirname, '../../assets/fonts');
      let fontFileName = 'THSarabunNew.ttf';

      const normalized = (name || '').toLowerCase().replace(/[\s-_]/g, '');
      if (normalized.includes('tahoma')) {
        fontFileName = isBold ? 'tahomabd.ttf' : 'tahoma.ttf';
      } else if (normalized.includes('cordia') || normalized.includes('angsana')) {
        fontFileName = 'cordia.ttf';
      } else {
        // Default official Thai font (TH Sarabun New)
        fontFileName = isBold ? 'THSarabunNew-Bold.ttf' : 'THSarabunNew.ttf';
      }

      const fontFilePath = path.join(fontsDir, fontFileName);
      if (fs.existsSync(fontFilePath)) {
        const bytes = fs.readFileSync(fontFilePath);
        loadedFonts[cacheKey] = await pdfDoc.embedFont(bytes);
        return loadedFonts[cacheKey];
      }

      // Fallback to tahoma
      const fallbackPath = path.join(fontsDir, 'tahoma.ttf');
      if (fs.existsSync(fallbackPath)) {
        loadedFonts[cacheKey] = await pdfDoc.embedFont(fs.readFileSync(fallbackPath));
        return loadedFonts[cacheKey];
      }

      return await pdfDoc.embedStandardFont('Helvetica' as any);
    };

    const defaultThaiFont = await loadFont('THSarabunNew', false);
    const defaultBoldFont = await loadFont('THSarabunNew', true);

    const page = pdfDoc.getPages()[0];
    const defaultInkColor = rgb(0.04, 0.16, 0.38);

    // 1. Draw 13-digit ID Card with laser accuracy into the 13 boxes
    const mappings = customMappings || defaultFieldMappings;
    const idCardConfig = mappings.find(m => m.id === 'idCard');
    const rawId = (idCardConfig?.customText || patient.idCard || '').replace(/\D/g, '');
    const idDigits = rawId.padEnd(13, ' ').slice(0, 13);

    // Exact vector coordinates of the 13 boxes on Form สปส. 2-19 (1 - 4 - 5 - 2 - 1)
    const ID_CARD_BOX_OFFSETS = [
      0,      // Box 1 (digit 1)
      16.65,  // Box 2 (digit 2) - after 1st hyphen
      26.10,  // Box 3 (digit 3)
      35.55,  // Box 4 (digit 4)
      44.70,  // Box 5 (digit 5)
      61.35,  // Box 6 (digit 6) - after 2nd hyphen
      69.80,  // Box 7 (digit 7)
      78.50,  // Box 8 (digit 8)
      87.95,  // Box 9 (digit 9)
      97.10,  // Box 10 (digit 10)
      113.30, // Box 11 (digit 11) - after 3rd hyphen
      122.65, // Box 12 (digit 12)
      140.05  // Box 13 (digit 13) - after 4th hyphen
    ];
    const BOX_WIDTH = 9.15;
    const isBold = Boolean(idCardConfig?.isBold);
    const idFont = await loadFont(idCardConfig?.fontFamily || 'THSarabunNew', isBold);
    const idFontSize = idCardConfig?.fontSize || 12.5;
    const idColor = hexToRgb(idCardConfig?.color || '#081d38');
    const baseX = idCardConfig?.x ?? 413.55;
    const baseY = idCardConfig?.y ?? 672.8;

    for (let i = 0; i < 13; i++) {
      const digit = idDigits[i];
      if (digit && digit !== ' ') {
        const boxX = baseX + ID_CARD_BOX_OFFSETS[i];
        const textWidth = idFont.widthOfTextAtSize(digit, idFontSize);
        const textX = boxX + (BOX_WIDTH - textWidth) / 2;
        page.drawText(digit, {
          x: textX,
          y: baseY,
          size: idFontSize,
          font: idFont,
          color: idColor
        });
      }
    }

    // 2. Draw Checkmarks on Checkboxes (Dynamic from mappings or standard defaults)
    const checkmarkFields = mappings.filter(m => m.id.startsWith('check_') || m.customText === '✓');
    if (checkmarkFields.length > 0) {
      for (const cm of checkmarkFields) {
        if (cm.customText !== '' && cm.customText !== ' ' && cm.customText !== 'false') {
          const color = hexToRgb(cm.color || '#081d38');
          drawCheckmark(page, cm.x, cm.y, color);
        }
      }
    } else {
      // Default official checkmarks (Matching the exact vector boxes of Form สปส. 2-19)
      drawCheckmark(page, 204.75, 649.47, defaultInkColor); // 1. ผู้ป่วยนอก
      drawCheckmark(page, 150.3, 628.62, defaultInkColor);  // 2. เป็นสถานพยาบาลที่เลือก
      drawCheckmark(page, 398.3, 461.17, defaultInkColor);  // 5. ขอรับเงิน: ธนาคาร
      drawCheckmark(page, 79.3, 400.97, defaultInkColor);   // 6. ใบรับรองแพทย์
      drawCheckmark(page, 79.3, 381.47, defaultInkColor);   // 6. ใบสรุป/ใบแสดงรายการค่ารักษา
    }

    // 2.5. Draw strikeout lines on unused title prefixes in "ข้าพเจ้า (นาย, นาง, นางสาว)"
    const certifyNameConfig = mappings.find(m => m.id === 'patientCertifyName');
    const fullNameFieldConfig = mappings.find(m => m.id === 'fullName');
    const effectiveFullName = fullNameFieldConfig?.customText || certifyNameConfig?.customText || patient.fullName || '';
    const strikeColor = hexToRgb(certifyNameConfig?.color || fullNameFieldConfig?.color || '#081d38');
    drawTitleStrikeouts(page, effectiveFullName, strikeColor);

    // 3. Render mapped text fields with custom fonts and formatting
    const hasChiefLine2 = mappings.some(m => m.id === 'chiefComplaintLine2');
    const hasTreatmentLine2 = mappings.some(m => m.id === 'treatmentMethod2Line2');
    let chiefComplaintFallbackLine2 = '';
    let treatmentMethodFallbackLine2 = '';

    for (const mapping of mappings) {
      if (mapping.id === 'idCard') continue; // Handled specially in Step 1
      if (mapping.id.startsWith('check_') || mapping.customText === '✓') continue; // Handled specially in Step 2

      let displayVal = mapping.customText;
      if (displayVal === undefined || displayVal === null) {
        const rawVal = (patient as any)[mapping.key];
        if (mapping.format) {
          displayVal = mapping.format(rawVal, patient);
        } else if (mapping.id === 'chiefComplaint') {
          const fullText = String(rawVal || '');
          const { line1, line2 } = splitThaiTextLines(fullText, 65);
          displayVal = line1;
          chiefComplaintFallbackLine2 = line2;
        } else if (mapping.id === 'chiefComplaintLine2') {
          const parentField = mappings.find(m => m.id === 'chiefComplaint');
          const fullText = parentField?.customText !== undefined && parentField?.customText !== null
            ? parentField.customText
            : String(rawVal || '');
          const { line2 } = splitThaiTextLines(fullText, 65);
          displayVal = line2;
        } else if (mapping.id === 'treatmentMethod2') {
          const fullText = String(rawVal || 'ให้การรักษาทางยา ติดตามอาการอย่างใกล้ชิด และให้คำแนะนำฟื้นฟูสมรรถภาพร่างกาย');
          const { line1, line2 } = splitThaiTextLines(fullText, 55);
          displayVal = line1;
          treatmentMethodFallbackLine2 = line2;
        } else if (mapping.id === 'treatmentMethod2Line2') {
          const parentField = mappings.find(m => m.id === 'treatmentMethod2');
          const fullText = parentField?.customText !== undefined && parentField?.customText !== null
            ? parentField.customText
            : String(rawVal || 'ให้การรักษาทางยา ติดตามอาการอย่างใกล้ชิด และให้คำแนะนำฟื้นฟูสมรรถภาพร่างกาย');
          const { line2 } = splitThaiTextLines(fullText, 55);
          displayVal = line2;
        } else if (mapping.id === 'treatmentDateStart' || mapping.id === 'treatmentDateEnd') {
          displayVal = formatThaiDateShort(rawVal);
        } else if (mapping.id === 'certifyDateDay') {
          displayVal = getThaiDateParts(rawVal).day;
        } else if (mapping.id === 'certifyDateMonth') {
          displayVal = getThaiDateParts(rawVal).monthFull;
        } else if (mapping.id === 'certifyDateYear') {
          displayVal = getThaiDateParts(rawVal).year;
        } else if (mapping.id === 'hospitalName') {
          displayVal = process.env.HOSPITAL_NAME || 'โรงพยาบาลศูนย์การแพทย์เฉพาะทาง';
        } else if (mapping.id === 'directorPosition') {
          displayVal = 'ผู้อำนวยการโรงพยาบาล';
        } else if (mapping.id === 'directorName') {
          displayVal = `( ${rawVal || 'นพ. ธีรภัทร เวชศาสตร์ฟื้นฟู'} )`;
        } else if (mapping.id === 'patientCertifyName') {
          displayVal = stripThaiTitlePrefix(String(rawVal || patient.fullName || ''));
        } else if (mapping.id === 'patientSignName') {
          displayVal = String(rawVal || patient.fullName || '');
        } else if (mapping.id === 'costNumeric') {
          displayVal = formatThaiCurrencyNumeric(rawVal !== undefined && rawVal !== null ? rawVal : patient.cost);
        } else if (mapping.id === 'costText' || mapping.id === 'costWords') {
          displayVal = patient.cost !== undefined ? thaiBahtText(Number(patient.cost)) : String(rawVal || 'ห้าร้อยห้าสิบเจ็ดบาทถ้วน');
        } else {
          displayVal = String(rawVal !== undefined && rawVal !== null ? rawVal : '');
        }
      }

      if (!displayVal || displayVal.trim() === '') continue;

      const fontObj = await loadFont(mapping.fontFamily || 'THSarabunNew', mapping.isBold || false);
      const fontColor = hexToRgb(mapping.color || '#081d38');
      const fontSize = mapping.fontSize || 16;

      // Render precisely at mapping coordinates (1:1 with Word Studio canvas baseline)
      // In HTML/CSS with line-height: 1 and TH Sarabun New (ascent 0.844, descent 0.457, half-leading -0.1505),
      // the CSS baseline sits at 0.6935em from top while the Studio transform shifts by -0.844em,
      // placing the visual baseline 0.1505 * fontSize above mapping.y.
      const visualBaselineOffset = fontSize * 0.1505;
      page.drawText(displayVal, {
        x: mapping.x,
        y: mapping.y + visualBaselineOffset,
        size: fontSize,
        font: fontObj,
        color: fontColor
      });
    }

    // Fallback: If chiefComplaintLine2 was not in custom mappings but chiefComplaint had a 2nd line, draw it on line 2
    if (!hasChiefLine2 && chiefComplaintFallbackLine2) {
      const ccField = mappings.find(m => m.id === 'chiefComplaint');
      const fontObj = await loadFont(ccField?.fontFamily || 'THSarabunNew', ccField?.isBold || false);
      const fontColor = hexToRgb(ccField?.color || '#081d38');
      const fontSize = ccField?.fontSize || 16;
      page.drawText(chiefComplaintFallbackLine2, {
        x: 48.4,
        y: 562.6 + fontSize * 0.1505,
        size: fontSize,
        font: fontObj,
        color: fontColor
      });
    }

    // Fallback: If treatmentMethod2Line2 was not in custom mappings but had a 2nd line, draw it on line 2
    if (!hasTreatmentLine2 && treatmentMethodFallbackLine2) {
      const tmField = mappings.find(m => m.id === 'treatmentMethod2');
      const fontObj = await loadFont(tmField?.fontFamily || 'THSarabunNew', tmField?.isBold || false);
      const fontColor = hexToRgb(tmField?.color || '#081d38');
      const fontSize = tmField?.fontSize || 16;
      page.drawText(treatmentMethodFallbackLine2, {
        x: 49.1,
        y: 521.7 + fontSize * 0.1505,
        size: fontSize,
        font: fontObj,
        color: fontColor
      });
    }

    // Optional: Append attached medical record PDFs to the generated สปส. 2-19 PDF
    if (options?.includeMedicalRecords) {
      const recordPaths = patientRepository.getAllMedicalRecordPathsForPatient(patient);
      for (const filePath of recordPaths) {
        try {
          const medBytes = fs.readFileSync(filePath);
          const medPdf = await PDFDocument.load(medBytes, { ignoreEncryption: true });
          const copiedPages = await pdfDoc.copyPages(medPdf, medPdf.getPageIndices());
          for (const copiedPage of copiedPages) {
            pdfDoc.addPage(copiedPage);
          }
        } catch (err) {
          console.error(`[pdfService] Failed to merge medical record PDF (${filePath}):`, err);
        }
      }
    }

    return await pdfDoc.save();
  }
};
