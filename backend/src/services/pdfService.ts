import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PatientRecord } from './patientRepository';

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

function formatThaiDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const thaiYear = d.getFullYear() + 543;
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${thaiYear}`;
}

function getThaiDateParts(dateStr: string): { day: string; monthFull: string; year: string } {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    return { day: '11', monthFull: 'กันยายน', year: '2569' };
  }
  return {
    day: String(d.getDate()),
    monthFull: THAI_MONTHS_FULL[d.getMonth()],
    year: String(d.getFullYear() + 543)
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

// Draw a sharp, crisp vector checkmark [✓]
function drawCheckmark(page: any, x: number, y: number, color = rgb(0.04, 0.16, 0.38)) {
  page.drawLine({
    start: { x: x + 1, y: y + 4 },
    end: { x: x + 4, y: y + 1 },
    thickness: 1.5,
    color
  });
  page.drawLine({
    start: { x: x + 4, y: y + 1 },
    end: { x: x + 9, y: y + 9 },
    thickness: 1.5,
    color
  });
}

// Global font and coordinate mappings with standard Thai fonts (TH Sarabun New)
export let defaultFieldMappings: FieldConfig[] = [
  // ข้อ 1: ชื่อสถานพยาบาล
  {
    id: 'hospName',
    label: '1. ชื่อสถานพยาบาล',
    section: 'ข้อ 1',
    key: 'hospName',
    page: 1,
    x: 132,
    y: 689.5,
    fontSize: 14,
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
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 1: ประเภทผู้ป่วยนอก (HN/VN)
  {
    id: 'hnVnInfo',
    label: '1. ข้อมูลเวชระเบียน (HN/VN)',
    section: 'ข้อ 1',
    key: 'hn',
    page: 1,
    x: 345,
    y: 650.5,
    fontSize: 12,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val, p) => `(HN: ${val}  VN: ${p.vn || '-'})`
  },
  // ข้อ 3: บรรทัดที่ 1 อาการสำคัญ
  {
    id: 'chiefComplaint',
    label: '3. อาการสำคัญที่เข้ารับบริการ',
    section: 'ข้อ 3',
    key: 'chiefComplaint',
    page: 1,
    x: 245,
    y: 582.5,
    fontSize: 13,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ข้อ 3: บรรทัดที่ 2 การวินิจฉัยโรค
  {
    id: 'diagInfo',
    label: '3. การวินิจฉัยโรค (ICD-10)',
    section: 'ข้อ 3',
    key: 'diagPrimary',
    page: 1,
    x: 55,
    y: 563.0,
    fontSize: 13,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val, p) => `การวินิจฉัยโรค: ${val} - ${p.diagPrimaryName || ''} ${p.diagSecondary && p.diagSecondary !== '-' ? ' | ' + p.diagSecondary : ''}`
  },
  // ข้อ 4: วิธีการรักษาพยาบาล (บรรทัด 1)
  {
    id: 'treatmentMethod1',
    label: '4. วิธีการรักษาพยาบาล (บรรทัด 1)',
    section: 'ข้อ 4',
    key: 'department',
    page: 1,
    x: 155,
    y: 541.5,
    fontSize: 13,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val, p) => `ตรวจรักษาและติดตามอาการทางเวชกรรม แผนก${val || 'ศัลยกรรม'} (${p.clinicRoom || '-'})`
  },
  // ข้อ 4: วิธีการรักษาพยาบาล (บรรทัด 2)
  {
    id: 'treatmentMethod2',
    label: '4. วิธีการรักษาพยาบาล (บรรทัด 2)',
    section: 'ข้อ 4',
    key: 'assessmentNote',
    page: 1,
    x: 55,
    y: 522.0,
    fontSize: 13,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: () => `ให้การรักษาทางยา ติดตามอาการอย่างใกล้ชิด และให้คำแนะนำฟื้นฟูสมรรถภาพร่างกาย`
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: true,
    color: '#081d38',
    format: (val) => Number(val || 550).toLocaleString('th-TH')
  },
  // ข้อ 4: รวมเป็นเงิน (ตัวหนังสือ)
  {
    id: 'costText',
    label: '4. รวมเป็นเงิน (ตัวหนังสือ)',
    section: 'ข้อ 4',
    key: 'costText',
    page: 1,
    x: 275,
    y: 483.2,
    fontSize: 13,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => val || 'ห้าร้อยห้าสิบเจ็ดบาทถ้วน'
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 14,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38'
  },
  // ส่วนล่าง: ลงชื่อผู้ประกันตนในวงเล็บ
  {
    id: 'patientSignName',
    label: 'คำรับรอง: (ชื่อผู้ประกันตน)',
    section: 'คำรับรองผู้ประกันตน',
    key: 'fullName',
    page: 1,
    x: 345,
    y: 175.0,
    fontSize: 13,
    fontFamily: 'THSarabunNew',
    isBold: false,
    color: '#081d38',
    format: (val) => `( ${val} )`
  }
];

export const pdfService = {
  getFieldMappings(): FieldConfig[] {
    return defaultFieldMappings;
  },

  updateFieldMappings(newMappings: FieldConfig[]): FieldConfig[] {
    defaultFieldMappings = newMappings;
    return defaultFieldMappings;
  },

  async generatePdf(patient: PatientRecord, customMappings?: FieldConfig[]): Promise<Uint8Array> {
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

      if (name === 'THSarabunNew') {
        fontFileName = isBold ? 'THSarabunNew-Bold.ttf' : 'THSarabunNew.ttf';
      } else if (name === 'Tahoma') {
        fontFileName = isBold ? 'tahomabd.ttf' : 'tahoma.ttf';
      } else if (name === 'Cordia') {
        fontFileName = 'cordia.ttf';
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

    // 1. Draw 13-digit ID Card into the 13 boxes
    const rawId = (patient.idCard || '').replace(/\D/g, '');
    const idDigits = rawId.padEnd(13, ' ').slice(0, 13);
    const boxStartX = 415.5;
    const boxStepX = 11.85;
    const boxY = 671.0;

    for (let i = 0; i < 13; i++) {
      const digit = idDigits[i];
      if (digit && digit !== ' ') {
        page.drawText(digit, {
          x: boxStartX + i * boxStepX,
          y: boxY,
          size: 13,
          font: defaultBoldFont,
          color: defaultInkColor
        });
      }
    }

    // 2. Draw Checkmarks on Checkboxes
    drawCheckmark(page, 206.5, 650.5, defaultInkColor);
    drawCheckmark(page, 153.5, 629.5, defaultInkColor);
    drawCheckmark(page, 90.5, 461.8, defaultInkColor);
    drawCheckmark(page, 80.5, 401.4, defaultInkColor);
    drawCheckmark(page, 80.5, 382.0, defaultInkColor);

    // 3. Draw Date parts on the bottom patient certification
    const dateParts = getThaiDateParts(patient.treatmentDate);
    page.drawText(dateParts.day, {
      x: 320,
      y: 156.5,
      size: 13,
      font: defaultThaiFont,
      color: defaultInkColor
    });
    page.drawText(dateParts.monthFull, {
      x: 365,
      y: 156.5,
      size: 13,
      font: defaultThaiFont,
      color: defaultInkColor
    });
    page.drawText(dateParts.year, {
      x: 445,
      y: 156.5,
      size: 13,
      font: defaultThaiFont,
      color: defaultInkColor
    });

    // 4. Render mapped text fields with custom fonts and formatting
    const mappings = customMappings || defaultFieldMappings;

    for (const mapping of mappings) {
      let displayVal = mapping.customText;
      if (!displayVal) {
        const rawVal = (patient as any)[mapping.key];
        displayVal = mapping.format 
          ? mapping.format(rawVal, patient) 
          : String(rawVal !== undefined && rawVal !== null ? rawVal : '');
      }

      if (!displayVal || displayVal.trim() === '') continue;

      const fontObj = await loadFont(mapping.fontFamily || 'THSarabunNew', mapping.isBold || false);
      const fontColor = hexToRgb(mapping.color || '#081d38');
      const fontSize = mapping.fontSize || 14;

      page.drawText(displayVal, {
        x: mapping.x,
        y: mapping.y,
        size: fontSize,
        font: fontObj,
        color: fontColor
      });
    }

    return await pdfDoc.save();
  }
};
