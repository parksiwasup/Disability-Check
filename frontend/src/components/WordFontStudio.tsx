import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  RotateCcw, 
  Download, 
  Printer, 
  Eye, 
  Layers, 
  Palette, 
  Sparkles, 
  Maximize2, 
  Check, 
  ChevronDown,
  Sliders,
  Move,
  FileText,
  Search,
  Undo2,
  Redo2,
  Grid,
  Ruler,
  Highlighter,
  ZoomIn,
  ZoomOut,
  Edit3,
  ArrowLeftRight,
  Trash2,
  RefreshCw,
  Plus,
  PlusCircle,
  CheckSquare
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PatientRecord, FieldConfig } from '../types';
import { api } from '../api/client';

interface WordFontStudioProps {
  patients: PatientRecord[];
}

// A4 Dimensions in PDF Points (Standard 72 DPI)
const A4_WIDTH = 595.32;
const A4_HEIGHT = 841.92;

// 13-digit Thai ID Card Box Dimensions & Offsets on Form สปส. 2-19
const ID_CARD_BOX_OFFSETS = [
  0, 16.65, 26.10, 35.55, 44.70, 61.35, 69.80, 78.50, 87.95, 97.10, 113.30, 122.65, 140.05
];
const ID_CARD_BOX_WIDTH = 9.15;
const ID_CARD_CONTAINER_WIDTH = 149.2;

// Popular Thai Standard Fonts
export const THAI_FONTS = [
  { id: 'THSarabunNew', name: 'TH Sarabun New (ราชการ)', css: `'TH Sarabun New', 'Sarabun', sans-serif`, tag: 'มาตรฐานราชการ' },
  { id: 'Cordia', name: 'Cordia New (เอกสารสำนักงาน)', css: `'Cordia New', 'Cordia', sans-serif`, tag: 'ยอดนิยม' },
  { id: 'Angsana', name: 'Angsana New (เอกสารดั้งเดิม)', css: `'Angsana New', 'Angsana', sans-serif`, tag: 'คลาสสิก' },
  { id: 'Tahoma', name: 'Tahoma (เวชระเบียน / HOSxP)', css: `'Tahoma', sans-serif`, tag: 'คมชัดในกล่อง' },
  { id: 'Sarabun', name: 'Sarabun (กูเกิลฟอนต์)', css: `'Sarabun', sans-serif`, tag: 'เว็บการแพทย์' },
  { id: 'Prompt', name: 'Prompt (โมเดิร์นทันสมัย)', css: `'Prompt', sans-serif`, tag: 'โมเดิร์น' },
  { id: 'Kanit', name: 'Kanit (โมเดิร์นทางการ)', css: `'Kanit', sans-serif`, tag: 'สากล' },
];

// Standard Thai Font Sizes
export const STANDARD_THAI_SIZES = [
  { size: 9, label: '9 pt' },
  { size: 10, label: '10 pt (หมายเหตุย่อย)' },
  { size: 11, label: '11 pt' },
  { size: 12, label: '12 pt (ตารางแคบ)' },
  { size: 13, label: '13 pt' },
  { size: 14, label: '14 pt' },
  { size: 15, label: '15 pt' },
  { size: 16, label: '16 pt ⭐ (ค่าเริ่มต้นมาตรฐานราชการ / สปส.)' },
  { size: 18, label: '18 pt (หัวข้อตรวจ/แผนก)' },
  { size: 20, label: '20 pt (หัวเรื่องเอกสาร)' },
  { size: 22, label: '22 pt' },
  { size: 24, label: '24 pt (ชื่อสถานพยาบาลหัวกระดาษ)' },
];

// Standard Word Text Colors
const WORD_COLORS = [
  { hex: '#081d38', name: 'น้ำเงินเข้มทางการ (#081d38)' },
  { hex: '#000000', name: 'ดำมาตรฐาน (#000000)' },
  { hex: '#1e3a8a', name: 'น้ำเงินรอยัล (#1e3a8a)' },
  { hex: '#0f766e', name: 'เขียวหัวเป็ด (#0f766e)' },
  { hex: '#b91c1c', name: 'แดงกำกับ (#b91c1c)' },
];

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

// Standard Form 2-19 Checkboxes (Exact 9x11.4 pt vector boxes)
export const DEFAULT_CHECKMARKS: FieldConfig[] = [
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

export const CHECKBOX_PRESETS = [
  { id: 'check_opd', label: 'ผู้ป่วยนอก', section: 'ข้อ 1', x: 204.75, y: 649.47 },
  { id: 'check_ipd', label: 'ผู้ป่วยใน', section: 'ข้อ 1', x: 271.75, y: 649.37 },
  { id: 'check_hospital_choice', label: 'เป็นสถานพยาบาลที่เลือก', section: 'ข้อ 2', x: 150.3, y: 628.62 },
  { id: 'check_hospital_not_choice', label: 'ไม่เป็นสถานพยาบาลที่เลือก', section: 'ข้อ 2', x: 150.3, y: 604.57 },
  { id: 'check_payment_bank', label: 'ขอรับเงิน: ธนาคาร', section: 'ข้อ 5', x: 398.3, y: 461.17 },
  { id: 'check_payment_sso', label: 'ขอรับเงิน: สนง.ประกันสังคม', section: 'ข้อ 5', x: 91.55, y: 461.17 },
  { id: 'check_payment_postal', label: 'ขอรับเงิน: ธนาณัติ ปณ.', section: 'ข้อ 5', x: 210.05, y: 461.17 },
  { id: 'check_doc_med_cert', label: 'ใบรับรองแพทย์', section: 'ข้อ 6', x: 79.3, y: 400.97 },
  { id: 'check_doc_summary', label: 'ใบสรุป/ใบแสดงรายการค่ารักษา', section: 'ข้อ 6', x: 79.3, y: 381.47 },
];

export const WordFontStudio: React.FC<WordFontStudioProps> = ({ patients }) => {
  const [mappings, setMappings] = useState<FieldConfig[]>([]);
  const [history, setHistory] = useState<FieldConfig[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [selectedFieldId, setSelectedFieldId] = useState<string>('fullName');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [nudgeStep, setNudgeStep] = useState<number>(1.0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.3);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [viewMode, setViewMode] = useState<'interactive' | 'live-pdf'>('interactive');
  
  // Word Studio Ribbon & View toggles
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarSide, setSidebarSide] = useState<'left' | 'right'>('left');
  const [applyScope, setApplyScope] = useState<'all' | 'single'>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [inlineEditingFieldId, setInlineEditingFieldId] = useState<string | null>(null);
  const [searchFieldText, setSearchFieldText] = useState<string>('');
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'checkmarks' | 'fields'>('inspector');
  const [templateImgUrl, setTemplateImgUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [showPrintTip, setShowPrintTip] = useState<boolean>(false);

  // Track unsaved changes for manual save
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Pre-render the official A4 template PDF to a razor-sharp 2x retina raster image
  // This completely eliminates iframe plugin letterboxing, grey bars, and zoom desync
  useEffect(() => {
    let isMounted = true;
    const renderPdfTemplate = async () => {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument('/template.pdf');
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // 2x Retina resolution for crystal clarity at any zoom level
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (isMounted) {
            setTemplateImgUrl(canvas.toDataURL('image/png'));
          }
        }
      } catch (err) {
        console.warn('PDF.js template renderer fallback to iframe:', err);
      }
    };

    renderPdfTemplate();
    return () => { isMounted = false; };
  }, []);

  const studioContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      studioContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFitWidth = () => {
    if (canvasFrameRef.current) {
      const containerWidth = canvasFrameRef.current.clientWidth - 48;
      if (containerWidth > 200) {
        const calculatedZoom = Math.min(2.5, Math.max(0.6, Math.round((containerWidth / A4_WIDTH) * 100) / 100));
        setZoomLevel(calculatedZoom);
      }
    }
  };
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const activeField = mappings.find(m => m.id === selectedFieldId) || mappings[0];

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      const data = await api.getFieldMappings();
      // Remove unwanted fields: hnVnInfo (000090700), diagInfo (Z480), treatmentMethod1 (ศัลยกรรม)
      const cleaned = data.filter(m => !['hnVnInfo', 'diagInfo', 'treatmentMethod1'].includes(m.id));

      // Ensure the official A4 certify date fields exist for the bottom signature section
      const defaultCertifyDateFields: FieldConfig[] = [
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
          color: '#081d38'
        },
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
          color: '#081d38'
        },
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
          color: '#081d38'
        }
      ];

      for (const cf of defaultCertifyDateFields) {
        if (!cleaned.some(m => m.id === cf.id)) {
          cleaned.push(cf);
        }
      }

      const defaultIdCardField: FieldConfig = {
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
      };

      if (!cleaned.some(m => m.id === 'idCard')) {
        const insertIdx = cleaned.findIndex(m => m.id === 'fullName');
        if (insertIdx !== -1) {
          cleaned.splice(insertIdx + 1, 0, defaultIdCardField);
        } else {
          cleaned.push(defaultIdCardField);
        }
      }

      // Ensure Line 2 fields for Section 3 (Chief Complaint) and Section 4 (Treatment Method)
      const defaultChiefComplaintLine2: FieldConfig = {
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
      };

      const defaultTreatmentMethod2Line2: FieldConfig = {
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
      };

      const ensureLine2Fields = (list: FieldConfig[]) => {
        // Section 3: Chief Complaint
        const ccIdx = list.findIndex(m => m.id === 'chiefComplaint');
        if (ccIdx !== -1) {
          if (!list[ccIdx].label.includes('บรรทัดที่')) {
            list[ccIdx].label = '3. อาการสำคัญที่เข้ารับบริการ (บรรทัดที่ 1)';
          }
          if (!list.some(m => m.id === 'chiefComplaintLine2')) {
            list.splice(ccIdx + 1, 0, defaultChiefComplaintLine2);
          }
        } else if (!list.some(m => m.id === 'chiefComplaintLine2')) {
          list.push(defaultChiefComplaintLine2);
        }

        // Section 4: Treatment Method
        const tmIdx = list.findIndex(m => m.id === 'treatmentMethod2');
        if (tmIdx !== -1) {
          if (!list[tmIdx].label.includes('บรรทัดที่')) {
            list[tmIdx].label = '4. วิธีการรักษาพยาบาล (บรรทัดที่ 1)';
          }
          if (!list.some(m => m.id === 'treatmentMethod2Line2')) {
            list.splice(tmIdx + 1, 0, defaultTreatmentMethod2Line2);
          }
        } else if (!list.some(m => m.id === 'treatmentMethod2Line2')) {
          list.push(defaultTreatmentMethod2Line2);
        }
      };

      ensureLine2Fields(cleaned);

      // Ensure the 5 default checkmarks exist
      for (const cm of DEFAULT_CHECKMARKS) {
        if (!cleaned.some(m => m.id === cm.id)) {
          cleaned.push(cm);
        }
      }

      // Check if local storage has newer cached mappings
      let initialList = cleaned;
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
      try {
        const localSaved = localStorage.getItem('hospital_word_studio_mappings');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const isLegacyShifted = parsed.some((m: any) => m.id === 'fullName' && m.y > 675);
            if (!isLegacyShifted) {
              initialList = parsed.map((m: any) => {
                const mig = legacyCheckCoords[m.id];
                if (mig && Math.abs(m.x - mig.oldX) < 0.2 && Math.abs(m.y - mig.oldY) < 0.2) {
                  return { ...m, x: mig.newX, y: mig.newY };
                }
                if (m.id === 'certifyDateDay' && (m.x === 315 || m.x === 322)) return { ...m, x: 324, y: 156.5 };
                if (m.id === 'certifyDateMonth' && (m.x === 365 || m.x === 375)) return { ...m, x: 386, y: 156.5 };
                if (m.id === 'certifyDateYear' && (m.x === 445 || m.x === 450)) return { ...m, x: 468, y: 156.5 };
                if (m.id === 'costText' && m.x === 360) return { ...m, x: 315 };
                return m;
              });
            } else {
              localStorage.removeItem('hospital_word_studio_mappings');
            }
          }
        }
      } catch (e) {}

      if (!initialList.some(m => m.id === 'idCard')) {
        const insertIdx = initialList.findIndex(m => m.id === 'fullName');
        if (insertIdx !== -1) {
          initialList.splice(insertIdx + 1, 0, defaultIdCardField);
        } else {
          initialList.push(defaultIdCardField);
        }
      }

      ensureLine2Fields(initialList);

      // Clean up accidental hardcoded patient names in patientSignName / patientCertifyName
      // so it always dynamically synchronizes with the active patient
      for (const list of [cleaned, initialList]) {
        const signField = list.find(m => m.id === 'patientSignName');
        if (signField && signField.customText) {
          if (signField.customText.includes('รัสมี') || signField.customText.includes('รัศมี')) {
            delete signField.customText;
          }
        }
        const certifyField = list.find(m => m.id === 'patientCertifyName');
        if (certifyField && certifyField.customText) {
          if (certifyField.customText.includes('รัสมี') || certifyField.customText.includes('รัศมี')) {
            delete certifyField.customText;
          }
        }
      }
      try {
        localStorage.setItem('hospital_word_studio_mappings', JSON.stringify(initialList));
      } catch (e) {}

      for (const cm of DEFAULT_CHECKMARKS) {
        if (!initialList.some(m => m.id === cm.id)) {
          initialList.push(cm);
        }
      }

      // Automatically upgrade any field where fontSize is missing to official 16pt standard
      const withDefault16 = initialList.map(m => (!m.fontSize ? { ...m, fontSize: 16 } : m));

      setMappings(withDefault16);
      setHistory([withDefault16]);
      setHistoryIndex(0);
      if (withDefault16.length > 0 && (!selectedFieldId || ['hnVnInfo', 'diagInfo', 'treatmentMethod1'].includes(selectedFieldId))) {
        setSelectedFieldId(withDefault16[0].id);
      }

      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to load mappings:', err);
    }
  };

  const pushHistory = (newMappings: FieldConfig[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newMappings);
    if (updatedHistory.length > 30) updatedHistory.shift();
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUpdateField = (id: string, updates: Partial<FieldConfig>, recordHistory = true) => {
    setHasChanges(true);
    setMappings(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      if (recordHistory) pushHistory(next);
      return next;
    });
  };

  const handleDeleteField = (idToDelete: string) => {
    setHasChanges(true);
    setMappings(prev => {
      const next = prev.filter(m => m.id !== idToDelete);
      pushHistory(next);
      if (selectedFieldId === idToDelete) {
        setSelectedFieldId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleAddCustomTextBox = () => {
    const customCount = mappings.filter(m => m.id.startsWith('custom_')).length + 1;
    const newId = `custom_${Date.now()}`;
    const newField: FieldConfig = {
      id: newId,
      label: `ข้อความกำหนดเอง ${customCount}`,
      section: 'ข้อความเพิ่มเติม',
      key: newId,
      page: 1,
      x: 180,
      y: 440,
      fontSize: activeField?.fontSize || 16,
      fontFamily: activeField?.fontFamily || 'THSarabunNew',
      isBold: false,
      color: activeField?.color || '#081d38',
      customText: 'พิมพ์ข้อความของคุณที่นี่...'
    };

    setMappings(prev => {
      const next = [...prev, newField];
      pushHistory(next);
      return next;
    });
    setHasChanges(true);
    setSelectedFieldId(newId);
    setInlineEditingFieldId(newId);
  };

  const handleToggleCheckmarkPreset = (preset: typeof CHECKBOX_PRESETS[0]) => {
    setMappings(prev => {
      const exists = prev.some(m => m.id === preset.id);
      let next: FieldConfig[];
      if (exists) {
        // Toggle OFF (remove checkmark)
        next = prev.filter(m => m.id !== preset.id);
      } else {
        // Toggle ON & automatically deselect mutually exclusive option in the same section
        let filtered = prev;
        if (preset.id === 'check_opd') filtered = prev.filter(m => m.id !== 'check_ipd');
        if (preset.id === 'check_ipd') filtered = prev.filter(m => m.id !== 'check_opd');
        if (preset.id === 'check_hospital_choice') filtered = prev.filter(m => m.id !== 'check_hospital_not_choice');
        if (preset.id === 'check_hospital_not_choice') filtered = prev.filter(m => m.id !== 'check_hospital_choice');
        if (preset.id === 'check_payment_bank') filtered = prev.filter(m => !['check_payment_sso', 'check_payment_postal'].includes(m.id));
        if (preset.id === 'check_payment_sso') filtered = prev.filter(m => !['check_payment_bank', 'check_payment_postal'].includes(m.id));
        if (preset.id === 'check_payment_postal') filtered = prev.filter(m => !['check_payment_bank', 'check_payment_sso'].includes(m.id));

        const newCheck: FieldConfig = {
          id: preset.id,
          label: `✓ ${preset.label}`,
          section: preset.section,
          key: preset.id,
          page: 1,
          x: preset.x,
          y: preset.y,
          fontSize: 14,
          fontFamily: 'THSarabunNew',
          isBold: true,
          color: '#081d38',
          customText: '✓'
        };
        next = [...filtered, newCheck];
      }
      pushHistory(next);
      return next;
    });
    setHasChanges(true);
    setSelectedFieldId(preset.id);
  };

  const handleAddCustomCheckmark = () => {
    const customCheckCount = mappings.filter(m => m.id.startsWith('check_')).length + 1;
    const newId = `check_custom_${Date.now()}`;
    const newCheck: FieldConfig = {
      id: newId,
      label: `✓ ติ๊กถูกใหม่ #${customCheckCount}`,
      section: 'เครื่องหมายถูก',
      key: 'checkmark',
      page: 1,
      x: 250,
      y: 500,
      fontSize: 14,
      fontFamily: 'THSarabunNew',
      isBold: true,
      color: '#081d38',
      customText: '✓'
    };
    setMappings(prev => {
      const next = [...prev, newCheck];
      pushHistory(next);
      return next;
    });
    setHasChanges(true);
    setSelectedFieldId(newId);
  };

  const handleUpdateAllFields = (updates: Partial<FieldConfig>, recordHistory = true) => {
    setHasChanges(true);
    setMappings(prev => {
      const next = prev.map(m => ({ ...m, ...updates }));
      if (recordHistory) pushHistory(next);
      return next;
    });
  };

  const handleChangeFontSize = (newSize: number) => {
    if (applyScope === 'all') {
      handleUpdateAllFields({ fontSize: newSize });
    } else if (activeField) {
      handleUpdateField(activeField.id, { fontSize: newSize });
    }
  };

  const handleNudgeFontSize = (delta: number) => {
    if (applyScope === 'all') {
      const baseSize = activeField?.fontSize || 16;
      const targetSize = Math.max(8, Math.min(36, baseSize + delta));
      handleUpdateAllFields({ fontSize: targetSize });
    } else if (activeField) {
      const targetSize = Math.max(8, Math.min(36, (activeField.fontSize || 16) + delta));
      handleUpdateField(activeField.id, { fontSize: targetSize });
    }
  };

  const handleChangeFontFamily = (fontFamilyId: string) => {
    if (applyScope === 'all') {
      handleUpdateAllFields({ fontFamily: fontFamilyId });
    } else if (activeField) {
      handleUpdateField(activeField.id, { fontFamily: fontFamilyId });
    }
  };

  const handleToggleBold = () => {
    if (applyScope === 'all') {
      const nextBold = !activeField?.isBold;
      handleUpdateAllFields({ isBold: nextBold });
    } else if (activeField) {
      handleUpdateField(activeField.id, { isBold: !activeField.isBold });
    }
  };

  const handleChangeColor = (hex: string) => {
    if (applyScope === 'all') {
      handleUpdateAllFields({ color: hex });
    } else if (activeField) {
      handleUpdateField(activeField.id, { color: hex });
    }
  };

  const handleApplyCurrentStyleToAll = () => {
    if (!activeField) return;
    handleUpdateAllFields({
      fontSize: activeField.fontSize,
      fontFamily: activeField.fontFamily,
      isBold: activeField.isBold,
      color: activeField.color
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setMappings(history[targetIndex]);
      setHasChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setMappings(history[targetIndex]);
      setHasChanges(true);
    }
  };

  // Keyboard navigation for precision positioning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (!activeField) return;

      const step = e.shiftKey ? 5.0 : nudgeStep;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUpdateField(activeField.id, { y: Math.round((activeField.y + step) * 10) / 10 });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleUpdateField(activeField.id, { y: Math.round((activeField.y - step) * 10) / 10 });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleUpdateField(activeField.id, { x: Math.round((activeField.x - step) * 10) / 10 });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleUpdateField(activeField.id, { x: Math.round((activeField.x + step) * 10) / 10 });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Delete') {
        if (activeField) {
          e.preventDefault();
          handleDeleteField(activeField.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeField, nudgeStep, historyIndex, history]);

  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!activeField) return;
    const newX = Math.round((activeField.x + deltaX * nudgeStep) * 10) / 10;
    const newY = Math.round((activeField.y + deltaY * nudgeStep) * 10) / 10;
    handleUpdateField(activeField.id, { x: newX, y: newY });
  };

  // Warn user before closing window if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      try {
        localStorage.setItem('hospital_word_studio_mappings', JSON.stringify(mappings));
      } catch (e) {}

      await api.updateFieldMappings(mappings);
      setSaveSuccess(true);
      setHasChanges(false);
      setPreviewKey(Date.now());
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: any) {
      alert(`บันทึกการตั้งค่าไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Print official A4 document with 100% vector precision and locked paper dimensions
  const handlePrintA4 = async () => {
    setIsPrinting(true);
    setShowPrintTip(true);
    try {
      // 1. Auto-save current field mappings to backend first
      await api.updateFieldMappings(mappings);
      setPreviewKey(Date.now());

      // 2. Open dedicated print frame loading the pure A4 vector PDF (595.32 x 841.92 pt)
      const iframeId = 'official-a4-pdf-print-frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const printUrl = `${api.getPdfPreviewUrl(selectedPatient?.id || '')}&k=${Date.now()}`;
      iframe.src = printUrl;

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            // Fallback: window open for browser native print
            window.open(printUrl, '_blank');
          } finally {
            setIsPrinting(false);
          }
        }, 600);
      };
    } catch (err: any) {
      alert(`ไม่สามารถเตรียมพิมพ์เอกสารได้: ${err.message}`);
      setIsPrinting(false);
    }
  };

  // Convert PDF coordinate (y starts at bottom) to Screen coordinate (top starts at 0)
  const pdfToScreen = (x: number, y: number) => {
    const screenX = (x / A4_WIDTH) * 100;
    const screenY = ((A4_HEIGHT - y) / A4_HEIGHT) * 100;
    return { left: `${screenX}%`, top: `${screenY}%` };
  };

  // Dragging logic on sheet
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    if (inlineEditingFieldId === fieldId) return;
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const targetField = mappings.find(m => m.id === fieldId);
    if (!targetField || !canvasRef.current) return;

    const initialFieldX = targetField.x;
    const initialFieldY = targetField.y;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = A4_WIDTH / rect.width;
    const scaleY = A4_HEIGHT / rect.height;

    let latestX = initialFieldX;
    let latestY = initialFieldY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaScreenX = moveEvent.clientX - startX;
      const deltaScreenY = moveEvent.clientY - startY;

      latestX = Math.round((initialFieldX + deltaScreenX * scaleX) * 10) / 10;
      latestY = Math.round((initialFieldY - deltaScreenY * scaleY) * 10) / 10;

      // Update smoothly without cluttering undo history during mouse move
      handleUpdateField(fieldId, { x: latestX, y: latestY }, false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Push single history step at the end of drag
      handleUpdateField(fieldId, { x: latestX, y: latestY }, true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const parseThaiDateParts = (val: any) => {
    if (!val) return { day: '9', monthShort: 'ก.ย.', monthFull: 'กันยายน', year: '2569' };
    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    
    const m = String(val).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const year = parseInt(m[1], 10) + 543;
      const monthIdx = parseInt(m[2], 10) - 1;
      const day = String(parseInt(m[3], 10));
      return {
        day,
        monthShort: thaiMonthsShort[monthIdx] || 'ก.ย.',
        monthFull: thaiMonthsFull[monthIdx] || 'กันยายน',
        year: String(year)
      };
    }
    
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return {
        day: String(d.getDate()),
        monthShort: thaiMonthsShort[d.getMonth()] || 'ก.ย.',
        monthFull: thaiMonthsFull[d.getMonth()] || 'กันยายน',
        year: String(d.getFullYear() + 543)
      };
    }
    return { day: '9', monthShort: 'ก.ย.', monthFull: 'กันยายน', year: '2569' };
  };

  const convertIntToThaiWords = (n: number): string => {
    if (n === 0) return '';
    const textNum = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const textUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    const s = String(n);
    const len = s.length;
    let res = '';
    for (let i = 0; i < len; i++) {
      const digit = Number(s[i]);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos % 6 === 1 && digit === 1) res += '';
        else if (pos % 6 === 1 && digit === 2) res += 'ยี่';
        else if (pos % 6 === 0 && digit === 1 && len > 1 && s[i - 1] !== '0') res += 'เอ็ด';
        else res += textNum[digit];
        res += textUnit[pos % 6];
      } else if (pos > 0 && pos % 6 === 0) {
        res += 'ล้าน';
      }
    }
    return res;
  };

  const formatThaiBahtWords = (num: any): string => {
    const numericVal = Number(num);
    if (isNaN(numericVal) || numericVal === 0) return 'ศูนย์บาทถ้วน';
    const totalSatang = Math.round(Math.abs(numericVal) * 100);
    const bahtPart = Math.floor(totalSatang / 100);
    const satangPart = totalSatang % 100;
    let res = '';
    if (bahtPart > 0) res += `${convertIntToThaiWords(bahtPart)}บาท`;
    if (satangPart === 0) res += 'ถ้วน';
    else res += `${convertIntToThaiWords(satangPart)}สตางค์`;
    return res;
  };

  const formatThaiCurrency = (num: any): string => {
    const n = Number(num || 0);
    if (isNaN(n)) return String(num || '0');
    const hasDecimals = Math.round(n * 100) % 100 !== 0;
    return n.toLocaleString('th-TH', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  const stripThaiTitlePrefix = (fullName: string): string => {
    return String(fullName || '')
      .trim()
      .replace(/^(นางสาว|น\.ส\.|นส\.|นาง|นาย|ด\.ช\.|เด็กชาย|ด\.ญ\.|เด็กหญิง)\s*/, '')
      .trim();
  };

  const getTitleStrikeTargets = (fullName: string): Array<'mr' | 'mrs' | 'miss'> => {
    const name = String(fullName || '').trim();
    if (/^(นางสาว|น\.ส\.|นส\.|ด\.ญ\.|เด็กหญิง)/.test(name)) {
      return ['mr', 'mrs'];
    }
    if (/^นาง(?!สาว)/.test(name)) {
      return ['mr', 'miss'];
    }
    if (/^(นาย|ด\.ช\.|เด็กชาย|ร\.ต\.|จ\.ส\.|ส\.ต\.|พ\.ต\.|พ\.ท\.|พ\.อ\.)/.test(name)) {
      return ['mrs', 'miss'];
    }
    return [];
  };

  const getDisplayValue = (field: FieldConfig) => {
    if (field.customText !== undefined && field.customText !== null) {
      return field.customText;
    }
    const rawVal = (selectedPatient as any)?.[field.key];
    if (field.format) {
      return field.format(rawVal, selectedPatient);
    }
    if (field.id === 'costNumeric') {
      return formatThaiCurrency(rawVal !== undefined && rawVal !== null ? rawVal : (selectedPatient as any)?.cost);
    }
    if (field.id === 'costText' || field.id === 'costWords') {
      const costVal = (selectedPatient as any)?.cost;
      if (costVal !== undefined && costVal !== null) {
        return formatThaiBahtWords(costVal);
      }
      return rawVal || 'ห้าร้อยห้าสิบเจ็ดบาทถ้วน';
    }
    // Thai Date formatters (convert CE ISO 2026-09-09 to official Thai Buddhist Era)
    if (field.id === 'treatmentDateStart' || field.id === 'treatmentDateEnd') {
      const parts = parseThaiDateParts(rawVal);
      return `${parts.day} ${parts.monthShort} ${parts.year}`;
    }
    if (field.id === 'certifyDateDay') {
      return parseThaiDateParts(rawVal).day;
    }
    if (field.id === 'certifyDateMonth') {
      return parseThaiDateParts(rawVal).monthFull;
    }
    if (field.id === 'certifyDateYear') {
      return parseThaiDateParts(rawVal).year;
    }
    if (field.id === 'hospitalName') {
      return 'โรงพยาบาลศูนย์การแพทย์เฉพาะทาง';
    }
    if (field.id === 'directorPosition') {
      return 'ผู้อำนวยการโรงพยาบาล';
    }
    if (field.id === 'directorName') {
      return `( ${rawVal || 'นพ. ธีรภัทร เวชศาสตร์ฟื้นฟู'} )`;
    }
    if (field.id === 'patientCertifyName') {
      return stripThaiTitlePrefix(String(rawVal || (selectedPatient as any)?.fullName || ''));
    }
    if (field.id === 'patientSignName') {
      return String(rawVal || (selectedPatient as any)?.fullName || '');
    }
    if (field.id === 'costWords') {
      return 'ห้าร้อยห้าสิบเจ็ดบาทถ้วน';
    }
    // Section 3: Chief Complaint Line 1 & Line 2
    if (field.id === 'chiefComplaint') {
      const fullText = field.customText !== undefined && field.customText !== null
        ? field.customText
        : String(rawVal || '');
      const { line1 } = splitThaiTextLines(fullText, 65);
      return line1 || fullText;
    }
    if (field.id === 'chiefComplaintLine2') {
      if (field.customText !== undefined && field.customText !== null) {
        return field.customText;
      }
      const parentField = mappings.find(m => m.id === 'chiefComplaint');
      const parentRawVal = (selectedPatient as any)?.chiefComplaint;
      const fullText = parentField?.customText !== undefined && parentField?.customText !== null
        ? parentField.customText
        : String(parentRawVal || '');
      const { line2 } = splitThaiTextLines(fullText, 65);
      return line2;
    }
    // Section 4: Treatment Method Line 1 & Line 2
    if (field.id === 'treatmentMethod2') {
      const fullText = field.customText !== undefined && field.customText !== null
        ? field.customText
        : String(rawVal || 'ให้การรักษาทางยา ติดตามอาการอย่างใกล้ชิด และให้คำแนะนำฟื้นฟูสมรรถภาพร่างกาย');
      const { line1 } = splitThaiTextLines(fullText, 55);
      return line1 || fullText;
    }
    if (field.id === 'treatmentMethod2Line2') {
      if (field.customText !== undefined && field.customText !== null) {
        return field.customText;
      }
      const parentField = mappings.find(m => m.id === 'treatmentMethod2');
      const parentRawVal = (selectedPatient as any)?.assessmentNote;
      const fullText = parentField?.customText !== undefined && parentField?.customText !== null
        ? parentField.customText
        : String(parentRawVal || 'ให้การรักษาทางยา ติดตามอาการอย่างใกล้ชิด และให้คำแนะนำฟื้นฟูสมรรถภาพร่างกาย');
      const { line2 } = splitThaiTextLines(fullText, 55);
      return line2;
    }
    if (field.id === 'idCard') {
      return String(rawVal || '1800600123456').replace(/\D/g, '');
    }
    return rawVal !== undefined && rawVal !== null ? String(rawVal) : field.label;
  };

  const currentFontObj = THAI_FONTS.find(f => f.id === activeField?.fontFamily) || THAI_FONTS[0];

  const filteredMappings = mappings.filter(m => 
    m.label.toLowerCase().includes(searchFieldText.toLowerCase()) ||
    m.key.toLowerCase().includes(searchFieldText.toLowerCase())
  );

  return (
    <div 
      ref={studioContainerRef} 
      className={`w-full transition-all duration-300 ${
        isFullscreen ? 'bg-slate-900 p-3 sm:p-5 h-screen overflow-y-auto space-y-3' : 'space-y-3'
      }`}
    >
      
      {/* ================= MICROSOFT WORD AUTHENTIC RIBBON CONTAINER ================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-colors">
        
        {/* 1. Word Top App Bar (Clean Single-Line Header) */}
        <div className="bg-gradient-to-r from-[#185abd] via-[#1b62cc] to-[#144a9e] text-white px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-white text-[#185abd] flex items-center justify-center font-black text-sm shadow">
              W
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-sm">Word Format Studio</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold text-[10px]">
                สปส. 2-19 (A4 มาตรฐาน)
              </span>
            </div>

            <div className="hidden md:block h-4 w-px bg-white/25 mx-1" />

            {/* Undo / Redo right next to title like MS Word Quick Access Toolbar */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="px-2 py-1 hover:bg-white/20 rounded disabled:opacity-40 transition flex items-center gap-1"
                title="ย้อนกลับ (Ctrl + Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">ย้อนกลับ</span>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="px-2 py-1 hover:bg-white/20 rounded disabled:opacity-40 transition flex items-center gap-1"
                title="ทำซ้ำ (Ctrl + Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Quick Actions (Patient Selector, Status, Save, Print) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Patient Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950/25 hover:bg-slate-950/35 px-3 py-1.5 rounded-lg border border-white/20 transition">
              <span className="text-blue-100 text-[11px] font-medium shrink-0">ผู้ป่วย:</span>
              <select
                value={selectedPatientId}
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  setPreviewKey(Date.now());
                }}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer max-w-[230px] truncate"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                    {p.hn} - {p.fullName} ({p.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Unsaved / Saved Status */}
            {hasChanges ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                <span>ยังไม่บันทึก</span>
              </span>
            ) : saveSuccess ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/40">
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกแล้ว</span>
              </span>
            ) : null}

            {/* Save Button */}
            <button
              id="word-studio-save-btn"
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-white rounded-lg font-bold shadow transition disabled:opacity-50 active:scale-95 ${
                hasChanges 
                  ? 'bg-emerald-500 hover:bg-emerald-400 ring-2 ring-emerald-200 shadow-lg' 
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
              title="กดบันทึกค่าแม่แบบไว้ (Ctrl + S)"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'บันทึกแล้ว!' : isSaving ? 'กำลังบันทึก...' : 'บันทึกแม่แบบ'}</span>
            </button>

            {/* Print Official A4 Button */}
            <button
              id="word-studio-print-btn"
              onClick={handlePrintA4}
              disabled={isPrinting}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white text-[#185abd] hover:bg-blue-50 rounded-lg font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              title="สั่งพิมพ์แบบฟอร์ม สปส. 2-19 ขนาดมาตรฐาน A4"
            >
              <Printer className="w-3.5 h-3.5 text-[#185abd]" />
              <span>{isPrinting ? 'เตรียมพิมพ์...' : 'พิมพ์เอกสาร A4'}</span>
            </button>
          </div>
        </div>

        {/* 2. Organized 4-Group Ribbon Toolbar (Single Row on Desktop, Clear Labels) */}
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-200 dark:border-slate-800">
          
          {/* Left Groups: Font + Position + Insert */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* GROUP 1: แบบอักษรและสี (Typography & Ink) */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/90 px-2 py-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <span className="hidden xl:inline text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-200 dark:border-slate-800">
                1. ฟอนต์
              </span>

              <select
                value={activeField?.fontFamily || 'THSarabunNew'}
                onChange={(e) => handleChangeFontFamily(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-semibold px-1.5 py-1 rounded-lg focus:outline-none cursor-pointer w-36 text-xs truncate"
                title="เลือกแบบอักษรไทยมาตรฐาน"
              >
                {THAI_FONTS.map(f => (
                  <option key={f.id} value={f.id} className="text-slate-900 bg-white">
                    {f.name}
                  </option>
                ))}
              </select>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

              {/* Font Size Dropdown & Step Buttons */}
              <select
                value={activeField?.fontSize || 16}
                onChange={(e) => handleChangeFontSize(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-bold px-1.5 py-1 rounded-md text-center focus:outline-none cursor-pointer w-14 text-xs"
                title="ขนาดตัวอักษร (pt)"
              >
                {STANDARD_THAI_SIZES.map(s => (
                  <option key={s.size} value={s.size} className="text-slate-900 bg-white">
                    {s.size}pt
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleNudgeFontSize(1)}
                className="px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-bold transition"
                title="เพิ่มขนาดฟอนต์ (+1pt)"
              >
                A<span className="text-[9px]">▲</span>
              </button>
              <button
                onClick={() => handleNudgeFontSize(-1)}
                className="px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-bold transition"
                title="ลดขนาดฟอนต์ (-1pt)"
              >
                A<span className="text-[9px]">▼</span>
              </button>

              <button
                onClick={handleToggleBold}
                className={`p-1.5 rounded-lg border transition ${
                  activeField?.isBold 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                }`}
                title="ตัวหนา (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

              {/* Ink Colors */}
              <div className="flex items-center space-x-1">
                {WORD_COLORS.slice(0, 3).map(c => (
                  <button
                    key={c.hex}
                    onClick={() => handleChangeColor(c.hex)}
                    className={`w-4 h-4 rounded-full border transition ${
                      activeField?.color === c.hex 
                        ? 'border-blue-500 scale-110 ring-2 ring-blue-400/50' 
                        : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

              {/* Scope Switcher: All in Document vs Single Field */}
              <button
                onClick={() => setApplyScope(applyScope === 'all' ? 'single' : 'all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                  applyScope === 'all'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent'
                }`}
                title="คลิกเพื่อสลับว่าเวลาเปลี่ยนขนาดฟอนต์ จะเปลี่ยนทั้งใบ หรือเฉพาะช่องที่เลือก"
              >
                {applyScope === 'all' ? 'ปรับทั้งใบ' : 'เฉพาะช่องนี้'}
              </button>
            </div>

            {/* GROUP 2: เลื่อนตำแหน่ง (Position & Nudge) */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/90 px-2 py-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <span className="hidden xl:inline text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-200 dark:border-slate-800">
                2. ตำแหน่ง
              </span>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 px-1 font-mono">
                X:<b className="text-blue-600 dark:text-teal-400 ml-0.5">{activeField?.x}</b>
                <span className="mx-1">·</span>
                Y:<b className="text-blue-600 dark:text-teal-400 ml-0.5">{activeField?.y}</b>
              </span>

              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                <button onClick={() => handleNudge(-1, 0)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200" title="เลื่อนซ้าย (←)">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleNudge(0, 1)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200" title="เลื่อนขึ้น (↑)">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleNudge(0, -1)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200" title="เลื่อนลง (↓)">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleNudge(1, 0)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200" title="เลื่อนขวา (→)">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                value={nudgeStep}
                onChange={(e) => setNudgeStep(Number(e.target.value))}
                className="bg-transparent text-slate-600 dark:text-slate-300 font-mono text-[11px] font-semibold focus:outline-none cursor-pointer px-1"
                title="ระยะการขยับต่อครั้ง"
              >
                <option value={0.5} className="bg-slate-900 text-white">ทีละ 0.5pt</option>
                <option value={1.0} className="bg-slate-900 text-white">ทีละ 1pt</option>
                <option value={3.0} className="bg-slate-900 text-white">ทีละ 3pt</option>
              </select>
            </div>

            {/* GROUP 3: แทรกเพิ่ม (Insert Elements) */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/90 px-2 py-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <span className="hidden xl:inline text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-200 dark:border-slate-800">
                3. แทรก
              </span>

              <button
                id="btn-add-textbox-ribbon"
                onClick={handleAddCustomTextBox}
                className="flex items-center space-x-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition active:scale-95"
                title="เพิ่มกล่องข้อความใหม่บนกระดาษ"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ข้อความ</span>
              </button>

              <button
                id="btn-add-checkmark-ribbon"
                onClick={handleAddCustomCheckmark}
                className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition active:scale-95"
                title="เพิ่มเครื่องหมายถูก (✓) ใหม่บนกระดาษ"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>ติ๊กถูก (✓)</span>
              </button>
            </div>

          </div>

          {/* GROUP 4: มุมมอง & ซูม (View & Zoom Controls Combined) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/90 px-2 py-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm ml-auto">
            {/* Zoom Out / Percentage / Zoom In / Fit Width */}
            <button 
              onClick={() => setZoomLevel(Math.max(0.6, Math.round((zoomLevel - 0.1) * 100) / 100))} 
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
              title="ย่อหน้ากระดาษ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <select
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="bg-transparent text-slate-900 dark:text-white font-mono text-[11px] font-bold focus:outline-none cursor-pointer text-center"
              title="เลือกขนาดซูมหน้ากระดาษ"
            >
              <option value={0.8} className="bg-slate-900 text-white">80%</option>
              <option value={1.0} className="bg-slate-900 text-white">100%</option>
              <option value={1.2} className="bg-slate-900 text-white">120%</option>
              <option value={1.3} className="bg-slate-900 text-white">130%</option>
              <option value={1.35} className="bg-slate-900 text-white">135% ⭐</option>
              <option value={1.5} className="bg-slate-900 text-white">150%</option>
              <option value={1.75} className="bg-slate-900 text-white">175%</option>
            </select>

            <button 
              onClick={() => setZoomLevel(Math.min(2.5, Math.round((zoomLevel + 0.1) * 100) / 100))} 
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
              title="ขยายหน้ากระดาษ"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFitWidth}
              className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-teal-400 rounded-lg text-[11px] font-semibold transition"
              title="ปรับขนาดกระดาษให้พอดีหน้าจอ"
            >
              พอดีจอ
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <button
              onClick={() => setShowRuler(!showRuler)}
              className={`p-1 rounded-lg transition ${
                showRuler 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="เปิด/ปิด ไม้บรรทัด"
            >
              <Ruler className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1 rounded-lg transition ${
                showGrid 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="เปิด/ปิด เส้นตาราง"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-2 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                isSidebarOpen 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' 
                  : 'bg-blue-600 text-white'
              }`}
              title="ซ่อนหรือแสดงแผงด้านซ้าย"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'ซ่อนแผง' : 'แผงข้าง'}</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'interactive' ? 'live-pdf' : 'interactive')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                viewMode === 'live-pdf'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="สลับดูไฟล์ PDF จริงที่จะใช้พิมพ์ หรือกลับมาโหมดลากย้าย"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{viewMode === 'interactive' ? 'ดู PDF จริง' : 'กลับโหมดแก้ไข'}</span>
            </button>
          </div>
        </div>

        {/* 3. Direct Formula / Text Edit Bar (Like Excel/Word Formula Bar) */}
        <div className="bg-slate-100/90 dark:bg-slate-950/70 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs border-t border-slate-200/80 dark:border-slate-800/80 gap-2">
          <div className="flex-1 flex items-center space-x-2 min-w-[260px]">
            <span className="px-2 py-0.5 rounded bg-blue-600/10 dark:bg-teal-500/15 text-blue-700 dark:text-teal-300 border border-blue-500/20 dark:border-teal-500/30 font-bold flex items-center gap-1.5 shrink-0">
              {activeField?.id.startsWith('check_') ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Edit3 className="w-3.5 h-3.5" />
              )}
              <span>{activeField?.label || 'เลือกข้อความ'}</span>
            </span>

            {activeField?.id.startsWith('check_') ? (
              <div className="flex-1 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                <span>เครื่องหมายถูก (✓) — คลิกแล้วลากขยับบนกระดาษ หรือใช้ปุ่มลูกศรเลื่อนตำแหน่งด้านบน</span>
                <button
                  onClick={() => handleDeleteField(activeField.id)}
                  className="text-rose-500 hover:underline font-semibold ml-2"
                >
                  เอาติ๊กถูกออก
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={activeField?.customText !== undefined ? activeField.customText : (activeField ? getDisplayValue(activeField) : '')}
                placeholder={activeField?.id === 'idCard' ? 'พิมพ์เลขบัตร 13 หลัก...' : 'พิมพ์แก้ไขข้อความในช่องนี้ได้ทันที...'}
                onChange={(e) => activeField && handleUpdateField(activeField.id, { customText: e.target.value })}
                className={`flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  activeField?.id === 'idCard' ? 'font-mono tracking-wider text-xs' : ''
                }`}
              />
            )}

            {activeField?.customText !== undefined && !activeField.id.startsWith('check_') && !activeField.id.startsWith('custom_') && (
              <button
                onClick={() => activeField && handleUpdateField(activeField.id, { customText: undefined })}
                className="px-2.5 py-1 text-[11px] bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-teal-400 hover:underline rounded-lg border border-slate-300 dark:border-slate-700 font-semibold shrink-0"
                title="รีเซ็ตกลับเป็นข้อมูลจาก Excel"
              >
                คืนค่าจาก Excel
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-[11px] text-slate-400">
            <span>💡 คลิกที่ข้อความบนกระดาษเพื่อเลือก • ลากเพื่อย้าย • ดับเบิลคลิกเพื่อพิมพ์</span>
          </div>
        </div>
      </div>

      {/* ================= INTERACTIVE WORKSPACE (CANVAS + TABBED SIDEBAR) ================= */}
      <div className="flex flex-col lg:flex-row gap-3 w-full items-start">
        
        {/* Document Canvas Column (Flex-1 expands to fill all remaining space) */}
        <div className={`flex-1 w-full min-w-0 flex flex-col items-center transition-all duration-300 ${
          sidebarSide === 'left' ? 'lg:order-2' : 'lg:order-1'
        }`}>
          
          {/* Print Tip Banner for Standard A4 Calibration */}
          {showPrintTip && (
            <div className="w-full mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium shadow-lg animate-fadeIn border border-blue-400">
              <div className="flex items-center space-x-2.5">
                <span className="text-base">🖨️</span>
                <span>
                  <b>เคล็ดลับพิมพ์ A4 ไม่คลาดเคลื่อน:</b> ระบบล็อกขนาดหน้ากระดาษไว้ที่มาตรฐาน ISO A4 (210 × 297 มม.) แล้ว เมื่อเปิดหน้าต่างเครื่องพิมพ์ (Print Dialog) กรุณาเลือก <b>ขนาดกระดาษ = A4</b> และ <b>สเกล = ขนาดจริง (Actual Size / 100%)</b> ข้อความจะลงตรงเส้นประ 100%
                </span>
              </div>
              <button 
                onClick={() => setShowPrintTip(false)} 
                className="text-blue-200 hover:text-white px-2 py-0.5 rounded font-bold transition ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Paper Canvas Frame (Full Height Expanded) */}
          <div 
            ref={canvasFrameRef}
            className="w-full flex justify-center overflow-auto p-3 sm:p-5 bg-slate-200 dark:bg-slate-950/70 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner min-h-[calc(100vh-210px)]"
          >
            
            {viewMode === 'live-pdf' ? (
              <div 
                className="bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-400"
                style={{ width: `${A4_WIDTH * zoomLevel}px`, height: `${A4_HEIGHT * zoomLevel}px` }}
              >
                <iframe
                  key={previewKey}
                  src={`${api.getPdfPreviewUrl(selectedPatient?.id || '')}&k=${previewKey}#toolbar=0&navpanes=0`}
                  className="w-full h-full"
                  title="PDF Live"
                />
              </div>
            ) : (
              /* Interactive Visual Paper Canvas with Word-like Ruler */
              <div 
                className="relative flex flex-col items-center shrink-0 origin-top"
                style={{
                  width: `${A4_WIDTH * zoomLevel}px`,
                  minHeight: `${(A4_HEIGHT + (showRuler ? 20 : 0)) * zoomLevel}px`,
                }}
              >
                <div
                  style={{
                    width: `${A4_WIDTH}px`,
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top left',
                  }}
                  className="relative flex flex-col items-start"
                >
                  {/* Horizontal Top Ruler (Synchronized with zoom) */}
                  {showRuler && (
                    <div 
                      className="h-5 bg-slate-100 border-b border-r border-slate-300 flex items-end text-[8px] font-mono text-slate-400 select-none overflow-hidden"
                      style={{ width: `${A4_WIDTH}px` }}
                    >
                      {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550].map(pt => (
                        <div 
                          key={pt} 
                          className="border-l border-slate-300 h-2 flex items-center justify-start pl-0.5"
                          style={{ width: `50px` }}
                        >
                          {pt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paper Body (Fixed exact A4 coordinates, scaled together via transform) */}
                  <div
                    ref={canvasRef}
                    className="relative bg-white rounded-sm shadow-2xl overflow-hidden border border-slate-400 select-none print-a4-canvas"
                    style={{
                      width: `${A4_WIDTH}px`,
                      height: `${A4_HEIGHT}px`,
                    }}
                  >
                    {/* Word-like Grid Overlay */}
                    {showGrid && (
                      <div 
                        className="absolute inset-0 pointer-events-none opacity-20 z-20"
                        style={{
                          backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
                          backgroundSize: `20px 20px`
                        }}
                      />
                    )}

                    {/* PDF Template Form Background (High-res 2x image with iframe fallback) */}
                    {templateImgUrl ? (
                      <img
                        src={templateImgUrl}
                        alt="แบบฟอร์ม สปส. 2-19"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none opacity-95"
                      />
                    ) : (
                      <iframe
                        src="/template.pdf#toolbar=0&navpanes=0&scrollbar=0"
                        className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
                        title="Template Background"
                      />
                    )}

                    {/* Automatic Title Strikeout Lines on "ข้าพเจ้า (นาย, นาง, นางสาว)" at y=239.2 */}
                    {(() => {
                      const fullNameField = mappings.find(m => m.id === 'fullName');
                      const certifyField = mappings.find(m => m.id === 'patientCertifyName');
                      const activeName = fullNameField?.customText || certifyField?.customText || (selectedPatient as any)?.fullName || '';
                      const strikeTargets = getTitleStrikeTargets(activeName);
                      const strikeColor = certifyField?.color || fullNameField?.color || '#081d38';
                      const titleBoxes: Record<'mr' | 'mrs' | 'miss', { x1: number; x2: number; label: string }> = {
                        mr:   { x1: 110.0, x2: 128.0, label: 'ขีดฆ่า นาย' },
                        mrs:  { x1: 132.5, x2: 149.0, label: 'ขีดฆ่า นาง' },
                        miss: { x1: 153.5, x2: 185.5, label: 'ขีดฆ่า นางสาว' }
                      };
                      const lineY = 239.2;
                      const topPct = ((A4_HEIGHT - lineY) / A4_HEIGHT) * 100;

                      return strikeTargets.map((target) => {
                        const box = titleBoxes[target];
                        if (!box) return null;
                        const leftPct = (box.x1 / A4_WIDTH) * 100;
                        const widthPct = ((box.x2 - box.x1) / A4_WIDTH) * 100;
                        return (
                          <div
                            key={`strike_${target}`}
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${widthPct}%`,
                              height: '1.35px',
                              backgroundColor: strikeColor,
                              transform: 'translateY(-50%)',
                              zIndex: 18,
                            }}
                            className="pointer-events-none rounded-full"
                            title={box.label}
                          />
                        );
                      });
                    })()}

                    {/* Interactive Overlaid Draggable Fields */}
                    {mappings.map((mapping) => {
                      const isSelected = mapping.id === selectedFieldId;
                      const isInlineEditing = inlineEditingFieldId === mapping.id;
                      const displayVal = getDisplayValue(mapping);
                      const fontDef = THAI_FONTS.find(f => f.id === mapping.fontFamily) || THAI_FONTS[0];

                      // Specialized high-precision renderer for 13-digit Thai National ID Card boxes
                      if (mapping.id === 'idCard') {
                        const rawId = (mapping.customText !== undefined 
                          ? mapping.customText 
                          : String((selectedPatient as any)?.idCard || '1800600123456')).replace(/\D/g, '');
                        const idDigits = rawId.padEnd(13, ' ').slice(0, 13).split('');
                        
                        const screenLeft = (mapping.x / A4_WIDTH) * 100;
                        const screenTop = ((A4_HEIGHT - (mapping.y + 11.4)) / A4_HEIGHT) * 100;
                        const containerWidthPct = (ID_CARD_CONTAINER_WIDTH / A4_WIDTH) * 100;
                        const containerHeightPct = (14.4 / A4_HEIGHT) * 100;

                        return (
                          <div
                            key={mapping.id}
                            onMouseDown={(e) => handleMouseDown(e, mapping.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setInlineEditingFieldId(mapping.id);
                            }}
                            onClick={() => setSelectedFieldId(mapping.id)}
                            style={{
                              position: 'absolute',
                              left: `${screenLeft}%`,
                              top: `${screenTop}%`,
                              width: `${containerWidthPct}%`,
                              height: `${containerHeightPct}%`,
                              zIndex: isSelected ? 35 : 15,
                            }}
                            className={`cursor-grab active:cursor-grabbing rounded transition-all select-none ${
                              isSelected 
                                ? 'ring-2 ring-blue-600 bg-blue-500/15 shadow-lg' 
                                : 'hover:ring-1 hover:ring-blue-400 hover:bg-blue-400/10'
                            }`}
                            title="เลขประจำตัวประชาชน (13 หลัก) ตรงช่องพอดีสวยงาม • คลิกเพื่อเลือก / ลากเพื่อขยับ / ดับเบิลคลิกเพื่อแก้ไข"
                          >
                            {isInlineEditing ? (
                              <div
                                className="absolute -top-3 -left-3 -right-3 -bottom-3 z-50 flex items-center bg-white dark:bg-slate-900 border-2 border-blue-600 rounded-lg shadow-2xl p-1 gap-1.5"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  autoFocus
                                  maxLength={17}
                                  value={mapping.customText !== undefined ? mapping.customText : (selectedPatient as any)?.idCard || ''}
                                  onChange={(e) => handleUpdateField(mapping.id, { customText: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      setInlineEditingFieldId(null);
                                    }
                                  }}
                                  placeholder="พิมพ์เลขบัตร 13 หลัก..."
                                  className="w-full h-full bg-transparent text-slate-900 dark:text-white px-2 text-xs font-mono font-bold focus:outline-none tracking-widest"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingFieldId(null);
                                  }}
                                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow"
                                >
                                  ตกลง
                                </button>
                              </div>
                            ) : (
                              ID_CARD_BOX_OFFSETS.map((dx, idx) => {
                                const digit = idDigits[idx] || '';
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      position: 'absolute',
                                      left: `${(dx / ID_CARD_CONTAINER_WIDTH) * 100}%`,
                                      width: `${(ID_CARD_BOX_WIDTH / ID_CARD_CONTAINER_WIDTH) * 100}%`,
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontFamily: fontDef.css,
                                      fontSize: `${mapping.fontSize || 12.5}px`,
                                      fontWeight: mapping.isBold ? 700 : 400,
                                      color: mapping.color || '#081d38',
                                      lineHeight: 1,
                                    }}
                                  >
                                    {digit}
                                  </div>
                                );
                              })
                            )}

                            {/* Coordinate tooltip when selected */}
                            {isSelected && !isInlineEditing && (
                              <>
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-40 flex items-center gap-1.5 shadow-blue-500/30">
                                  <span>เลขบัตร 13 หลัก | X: {mapping.x} | Y: {mapping.y} ({fontDef.name.split(' ')[0]} {mapping.fontSize || 12.5}pt)</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInlineEditingFieldId(mapping.id);
                                    }}
                                    className="bg-white/20 hover:bg-white/40 text-white px-1.5 py-0.5 rounded text-[9px] font-sans flex items-center gap-0.5 transition cursor-pointer"
                                    title="คลิกเพื่อพิมพ์แก้ไขเลขบัตรประชาชน"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                    <span>แก้ไขเลข</span>
                                  </button>
                                </div>
                                <span className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                                <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                              </>
                            )}
                          </div>
                        );
                      }

                      // Specialized renderer for Checkmarks (✓) - 1:1 vector match with 9x11.4pt PDF checkbox & drawLine
                      const isCheckmark = mapping.id.startsWith('check_') || mapping.customText === '✓';
                      if (isCheckmark) {
                        const screenLeft = (mapping.x / A4_WIDTH) * 100;
                        // In PDF, checkbox is 9.0pt wide x 11.4pt tall with bottom-left at (mapping.x, mapping.y)
                        const screenTop = ((A4_HEIGHT - (mapping.y + 11.4)) / A4_HEIGHT) * 100;
                        const boxWidthPct = (9.0 / A4_WIDTH) * 100;
                        const boxHeightPct = (11.4 / A4_HEIGHT) * 100;

                        return (
                          <div
                            key={mapping.id}
                            onMouseDown={(e) => handleMouseDown(e, mapping.id)}
                            onClick={() => setSelectedFieldId(mapping.id)}
                            style={{
                              position: 'absolute',
                              left: `${screenLeft}%`,
                              top: `${screenTop}%`,
                              width: `${boxWidthPct}%`,
                              height: `${boxHeightPct}%`,
                              zIndex: isSelected ? 35 : 20,
                            }}
                            className={`cursor-grab active:cursor-grabbing rounded-[1px] transition-all flex items-center justify-center select-none ${
                              isSelected 
                                ? 'ring-2 ring-emerald-600 bg-emerald-500/25 shadow-lg' 
                                : 'hover:ring-1 hover:ring-emerald-400 hover:bg-emerald-400/10'
                            }`}
                            title={`${mapping.label} (คลิกเลือก / ลากขยับตำแหน่ง / กด Delete เพื่อลบ)`}
                          >
                            <svg 
                              viewBox="0 0 9 11.4" 
                              className="w-full h-full pointer-events-none overflow-visible"
                            >
                              <polyline 
                                points="2.0,5.8 3.9,8.2 7.2,2.8" 
                                fill="none" 
                                stroke={mapping.color || '#081d38'} 
                                strokeWidth="1.35" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                              />
                            </svg>

                            {/* Coordinate tooltip when selected */}
                            {isSelected && (
                              <>
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-700 text-white font-mono text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-40 flex items-center gap-1 shadow-emerald-600/30 pointer-events-none">
                                  <span>{mapping.label} | X: {mapping.x} | Y: {mapping.y}</span>
                                </div>
                                <span className="absolute -top-1 -left-1 w-2 h-2 bg-emerald-600 rounded-full border border-white" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-600 rounded-full border border-white" />
                                <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-600 rounded-full border border-white" />
                                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-600 rounded-full border border-white" />
                              </>
                            )}
                          </div>
                        );
                      }

                      const screenLeft = (mapping.x / A4_WIDTH) * 100;
                      const screenTop = ((A4_HEIGHT - mapping.y) / A4_HEIGHT) * 100;

                      return (
                        <div
                          key={mapping.id}
                          onMouseDown={(e) => handleMouseDown(e, mapping.id)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setInlineEditingFieldId(mapping.id);
                          }}
                          onClick={() => setSelectedFieldId(mapping.id)}
                          style={{
                            position: 'absolute',
                            left: `${screenLeft}%`,
                            top: `${screenTop}%`,
                            fontSize: `${mapping.fontSize || 16}px`,
                            color: mapping.color || '#081d38',
                            fontFamily: fontDef.css,
                            fontWeight: mapping.isBold ? 700 : 400,
                            lineHeight: 1,
                            padding: 0,
                            margin: 0,
                            transform: 'translate(0, -84.4%)', // Exact TH Sarabun New baseline alignment (ascent 844 / 1000)
                            whiteSpace: mapping.customText?.includes('\n') ? 'pre-wrap' : 'nowrap',
                          }}
                          className={`cursor-grab active:cursor-grabbing rounded select-none transition-shadow ${
                            isSelected 
                              ? 'ring-2 ring-blue-600 bg-blue-100/70 shadow-lg z-30 font-medium' 
                              : 'hover:ring-1 hover:ring-blue-400/80 hover:bg-blue-50/40 z-10'
                          } ${!displayVal && !isSelected ? 'pointer-events-none opacity-0' : ''}`}
                          title={`${mapping.label} (ดับเบิลคลิกเพื่อพิมพ์ข้อความโดยตรง | ลากเพื่อขยับ)`}
                        >
                          {isInlineEditing ? (
                            <input
                              type="text"
                              autoFocus
                              value={mapping.customText !== undefined ? mapping.customText : displayVal}
                              onChange={(e) => handleUpdateField(mapping.id, { customText: e.target.value })}
                              onBlur={() => setInlineEditingFieldId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setInlineEditingFieldId(null);
                                }
                              }}
                              className="bg-white text-slate-900 border border-blue-600 rounded px-1 py-0 shadow-lg focus:outline-none"
                              style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                            />
                          ) : (
                            <span>{displayVal || (isSelected ? `[${mapping.label}]` : '')}</span>
                          )}

                          {/* Word-like Selection Frame & Floating Coordinates Tooltip */}
                          {isSelected && !isInlineEditing && (
                            <>
                              {/* Floating Coordinate Badge */}
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-40">
                                X: {mapping.x} | Y: {mapping.y} ({fontDef.name.split(' ')[0]} {mapping.fontSize || 16}pt)
                              </div>

                              {/* 4 Corner Handles */}
                              <span className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                              <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                              <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Clean Tabbed Inspector (320px fixed on desktop) */}
        {isSidebarOpen && (
          <aside className={`w-full lg:w-[320px] xl:w-[340px] shrink-0 animate-fadeIn ${
            sidebarSide === 'left' ? 'lg:order-1' : 'lg:order-2'
          }`}>
            <div className="glass-panel rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-xl">
              
              {/* Sidebar Top Header & Tab Switcher */}
              <div className="p-3 bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-teal-400" />
                    <span>แผงจัดการเอกสาร</span>
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setSidebarSide(sidebarSide === 'left' ? 'right' : 'left')}
                      className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-blue-500 flex items-center gap-1 font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 transition"
                      title="สลับฝั่งแผงเครื่องมือ (ซ้าย ⇄ ขวา)"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>{sidebarSide === 'left' ? 'ย้ายไปขวา' : 'ย้ายไปซ้าย'}</span>
                    </button>
                    <button
                      onClick={loadMappings}
                      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                      title="คืนค่าพิกัดเริ่มต้น"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3 Clean Segmented Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-slate-200/80 dark:bg-slate-950 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setSidebarTab('inspector')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
                      sidebarTab === 'inspector'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>ช่องที่เลือก</span>
                  </button>
                  <button
                    onClick={() => setSidebarTab('checkmarks')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
                      sidebarTab === 'checkmarks'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>ติ๊กถูก (✓)</span>
                  </button>
                  <button
                    onClick={() => setSidebarTab('fields')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
                      sidebarTab === 'fields'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>ทั้งหมด ({mappings.length})</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: ช่องที่เลือก (Inspector) */}
              {sidebarTab === 'inspector' && activeField && (
                <div className="p-4 space-y-3.5 text-xs animate-fadeIn">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ชื่อช่องข้อมูลที่กำลังเลือกบนกระดาษ</label>
                    <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold flex items-center justify-between gap-2">
                      <span className="truncate">{activeField.label}</span>
                      {activeField.section && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                          {activeField.section}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeField.id.startsWith('custom_') && (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ตั้งชื่อป้ายกำกับกล่องข้อความนี้</label>
                      <input
                        type="text"
                        value={activeField.label}
                        onChange={(e) => handleUpdateField(activeField.id, { label: e.target.value })}
                        placeholder="เช่น ธนาคาร, สาขา, หมายเหตุ..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {!activeField.id.startsWith('check_') && (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                        {activeField.id === 'idCard' 
                          ? 'เลขบัตรประชาชน 13 หลัก:' 
                          : 'ข้อความที่แสดงในช่องนี้:'}
                      </label>
                      {activeField.id === 'idCard' ? (
                        <input
                          type="text"
                          maxLength={17}
                          value={activeField.customText !== undefined ? activeField.customText : (String((selectedPatient as any)?.[activeField.key] || ''))}
                          placeholder="เช่น 1800600123456"
                          onChange={(e) => handleUpdateField(activeField.id, { customText: e.target.value })}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono tracking-widest font-bold focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <textarea
                          rows={2}
                          value={activeField.customText !== undefined ? activeField.customText : getDisplayValue(activeField)}
                          placeholder="พิมพ์ข้อความใหม่..."
                          onChange={(e) => handleUpdateField(activeField.id, { customText: e.target.value })}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      )}
                      {activeField.customText !== undefined && !activeField.id.startsWith('custom_') && (
                        <button
                          onClick={() => handleUpdateField(activeField.id, { customText: undefined })}
                          className="text-[11px] text-blue-500 dark:text-teal-400 hover:underline mt-1 font-medium"
                        >
                          ↺ คืนค่าเป็นข้อมูลจาก Excel อัตโนมัติ
                        </button>
                      )}
                    </div>
                  )}

                  {/* Fine Coordinate Inputs */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">แนวนอน X (ซ้าย-ขวา)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={activeField.x}
                        onChange={(e) => handleUpdateField(activeField.id, { x: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white font-mono text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">แนวตั้ง Y (ล่าง-บน)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={activeField.y}
                        onChange={(e) => handleUpdateField(activeField.id, { y: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white font-mono text-center font-bold"
                      />
                    </div>
                  </div>

                  {/* Quick Actions in Inspector */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <button
                      onClick={handleAddCustomTextBox}
                      className="w-full py-2 px-3 bg-teal-600/15 hover:bg-teal-600/25 text-teal-600 dark:text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ เพิ่มกล่องข้อความใหม่</span>
                    </button>

                    <button
                      onClick={() => activeField && handleDeleteField(activeField.id)}
                      className="w-full py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบช่องนี้ออกจากกระดาษ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: เครื่องหมายติ๊กถูก (Checkmarks) */}
              {sidebarTab === 'checkmarks' && (
                <div className="p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">คลิกเพื่อเปิด/ปิดเครื่องหมายถูกในแต่ละข้อ</span>
                    <button
                      onClick={handleAddCustomCheckmark}
                      className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      <span>เพิ่มจุดใหม่</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {CHECKBOX_PRESETS.map((preset) => {
                      const isActive = mappings.some(m => m.id === preset.id);
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleToggleCheckmarkPreset(preset)}
                          className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between text-left transition font-medium ${
                            isActive 
                              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-200 shadow-sm' 
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                              {preset.section}
                            </span>
                            <span className="truncate">{preset.label}</span>
                          </div>
                          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                            isActive 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: รายการฟิลด์ทั้งหมด (All Fields) */}
              {sidebarTab === 'fields' && (
                <div className="p-4 space-y-2.5 animate-fadeIn">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อช่อง..."
                      value={searchFieldText}
                      onChange={(e) => setSearchFieldText(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {filteredMappings.map(m => {
                      const isSelected = m.id === selectedFieldId;
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedFieldId(m.id);
                            setSidebarTab('inspector');
                          }}
                          className={`px-3 py-2 rounded-xl border cursor-pointer transition text-xs flex items-center justify-between ${
                            isSelected 
                              ? 'bg-blue-600/15 border-blue-500 text-blue-900 dark:text-white font-semibold' 
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="block truncate">{m.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              X: {m.x} · Y: {m.y}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(m.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                            title="ลบฟิลด์นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
