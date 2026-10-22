import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
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
  FileText
} from 'lucide-react';
import { PatientRecord, FieldConfig } from '../types';
import { api } from '../api/client';

interface WordFontStudioProps {
  patients: PatientRecord[];
}

// A4 Dimensions in PDF Points
const A4_WIDTH = 595.32;
const A4_HEIGHT = 841.92;

export const WordFontStudio: React.FC<WordFontStudioProps> = ({ patients }) => {
  const [mappings, setMappings] = useState<FieldConfig[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('fullName');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [nudgeStep, setNudgeStep] = useState<number>(1.0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [viewMode, setViewMode] = useState<'interactive' | 'live-pdf'>('interactive');

  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const activeField = mappings.find(m => m.id === selectedFieldId) || mappings[0];

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      const data = await api.getFieldMappings();
      setMappings(data);
      if (data.length > 0 && !selectedFieldId) {
        setSelectedFieldId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load mappings:', err);
    }
  };

  const handleUpdateField = (id: string, updates: Partial<FieldConfig>) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!activeField) return;
    const newX = Math.round((activeField.x + deltaX * nudgeStep) * 10) / 10;
    const newY = Math.round((activeField.y + deltaY * nudgeStep) * 10) / 10;
    handleUpdateField(activeField.id, { x: newX, y: newY });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateFieldMappings(mappings);
      setSaveSuccess(true);
      setPreviewKey(Date.now());
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`บันทึกการตั้งค่าไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSaving(false);
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

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaScreenX = moveEvent.clientX - startX;
      const deltaScreenY = moveEvent.clientY - startY;

      // Invert Y because PDF coordinate (0,0) is at bottom
      const newX = Math.round((initialFieldX + deltaScreenX * scaleX) * 10) / 10;
      const newY = Math.round((initialFieldY - deltaScreenY * scaleY) * 10) / 10;

      handleUpdateField(fieldId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="space-y-4">
      
      {/* ================= MICROSOFT WORD STYLE RIBBON TOOLBAR ================= */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Ribbon Top Brand Bar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow">
              W
            </div>
            <span className="font-bold text-slate-200">เครื่องมือจัดฟอนต์ & รูปแบบข้อความ สปส. 2-19 (Word Format Studio)</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px]">
              ฟอนต์ราชการ TH Sarabun New
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">เลือกดูตัวอย่างผู้ป่วย:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setPreviewKey(Date.now());
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.hn} - {p.fullName} ({p.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Word Command Toolbar */}
        <div className="p-3 bg-slate-900/90 flex flex-wrap items-center gap-3 text-xs border-b border-slate-800/80">
          
          {/* Group 1: Font Family (TH Sarabun New, Tahoma, Cordia) */}
          <div className="flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <Type className="w-4 h-4 text-teal-400 ml-1" />
            <select
              value={activeField?.fontFamily || 'THSarabunNew'}
              onChange={(e) => activeField && handleUpdateField(activeField.id, { fontFamily: e.target.value })}
              className="bg-slate-800 text-white font-medium px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer w-44"
            >
              <option value="THSarabunNew">TH Sarabun New (ราชการ)</option>
              <option value="Tahoma">Tahoma (คมชัด)</option>
              <option value="Cordia">Cordia New</option>
            </select>
          </div>

          {/* Group 2: Font Size (+ / -) */}
          <div className="flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 px-1 font-mono text-[11px]">ขนาด:</span>
            <input
              type="number"
              step="0.5"
              min="8"
              max="36"
              value={activeField?.fontSize || 14}
              onChange={(e) => activeField && handleUpdateField(activeField.id, { fontSize: Number(e.target.value) })}
              className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white focus:outline-none"
            />
            <button
              onClick={() => activeField && handleUpdateField(activeField.id, { fontSize: (activeField.fontSize || 14) + 1 })}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-bold"
              title="เพิ่มขนาดฟอนต์"
            >
              A<span className="text-[10px]">▲</span>
            </button>
            <button
              onClick={() => activeField && handleUpdateField(activeField.id, { fontSize: Math.max(8, (activeField.fontSize || 14) - 1) })}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-bold"
              title="ลดขนาดฟอนต์"
            >
              A<span className="text-[10px]">▼</span>
            </button>
          </div>

          {/* Group 3: Text Styles (Bold, Italic, Color) */}
          <div className="flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => activeField && handleUpdateField(activeField.id, { isBold: !activeField.isBold })}
              className={`p-1.5 rounded-lg border transition ${
                activeField?.isBold 
                  ? 'bg-blue-600 text-white border-blue-400 shadow' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="ตัวหนา (Bold)"
            >
              <Bold className="w-4 h-4" />
            </button>

            {/* Color Swatches */}
            <div className="flex items-center space-x-1 pl-1">
              <span className="text-[10px] text-slate-400">สีหมึก:</span>
              <button
                onClick={() => activeField && handleUpdateField(activeField.id, { color: '#081d38' })}
                className={`w-6 h-6 rounded-md bg-[#081d38] border-2 transition ${activeField?.color === '#081d38' ? 'border-teal-400 scale-110 shadow' : 'border-slate-600'}`}
                title="น้ำเงินเข้มทางการ (#081d38)"
              />
              <button
                onClick={() => activeField && handleUpdateField(activeField.id, { color: '#000000' })}
                className={`w-6 h-6 rounded-md bg-black border-2 transition ${activeField?.color === '#000000' ? 'border-teal-400 scale-110 shadow' : 'border-slate-600'}`}
                title="ดำมาตรฐาน (#000000)"
              />
              <button
                onClick={() => activeField && handleUpdateField(activeField.id, { color: '#1d4ed8' })}
                className={`w-6 h-6 rounded-md bg-blue-700 border-2 transition ${activeField?.color === '#1d4ed8' ? 'border-teal-400 scale-110 shadow' : 'border-slate-600'}`}
                title="น้ำเงินสว่าง (#1d4ed8)"
              />
            </div>
          </div>

          {/* Group 4: Nudge Direction Arrows (ขยับพิกัด 4 ทิศทาง) */}
          <div className="flex items-center space-x-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">ขยับ:</span>
            <div className="grid grid-cols-3 gap-0.5 w-20">
              <div></div>
              <button
                onClick={() => handleNudge(0, 1)}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700 flex items-center justify-center"
                title="เลื่อนขึ้น"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <div></div>
              
              <button
                onClick={() => handleNudge(-1, 0)}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700 flex items-center justify-center"
                title="เลื่อนซ้าย"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleNudge(0, -1)}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700 flex items-center justify-center"
                title="เลื่อนลง"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleNudge(1, 0)}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700 flex items-center justify-center"
                title="เลื่อนขวา"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step size selector */}
            <div className="flex flex-col text-[10px]">
              <span className="text-slate-500">ระยะก้าว:</span>
              <div className="flex gap-1">
                {[0.5, 1.0, 3.0].map((step) => (
                  <button
                    key={step}
                    onClick={() => setNudgeStep(step)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] ${nudgeStep === step ? 'bg-teal-600 text-white border-teal-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                  >
                    {step}pt
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Group 5: Active Coordinates Display */}
          <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-slate-500">X:</span>
              <span className="text-teal-300 ml-1 font-bold">{activeField?.x}</span>
            </div>
            <div className="ml-2">
              <span className="text-slate-500">Y:</span>
              <span className="text-teal-300 ml-1 font-bold">{activeField?.y}</span>
            </div>
          </div>

          {/* Group 6: Save & View Toggles */}
          <div className="ml-auto flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'interactive' ? 'live-pdf' : 'interactive')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-medium"
            >
              <Eye className="w-4 h-4 text-teal-400" />
              <span>{viewMode === 'interactive' ? 'ดูโหมด PDF แท้' : 'โหมดจัดวางลากย้าย'}</span>
            </button>

            <button
              id="word-studio-save-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/40 transition disabled:opacity-50"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'บันทึกสำเร็จแล้ว!' : isSaving ? 'กำลังบันทึก...' : 'บันทึกการจัดรูปแบบ'}</span>
            </button>
          </div>
        </div>

        {/* Selected Field Quick Inspector Bar */}
        <div className="bg-slate-950/40 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-slate-500 font-semibold">ฟิลด์ที่เลือกอยู่:</span>
            <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              {activeField?.label}
            </span>
            <span className="text-slate-500">| ข้อมูลจาก Excel:</span>
            <span className="font-mono text-cyan-300 truncate max-w-md">
              {String((selectedPatient as any)?.[activeField?.key || ''] || '-')}
            </span>
          </div>

          {/* Quick Field Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">เลือกฟิลด์ด่วน:</span>
            <select
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="bg-slate-800 text-white font-medium px-2 py-1 rounded border border-slate-700 text-xs focus:outline-none"
            >
              {mappings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.x}, {m.y})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ================= INTERACTIVE WORKSPACE (CANVAS + FIELD LIST) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Document View (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          
          {/* Zoom controls */}
          <div className="w-full flex items-center justify-between mb-2 px-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="flex items-center gap-1 font-semibold text-teal-400">
                <Move className="w-3.5 h-3.5" />
                คลิกข้อความบนหน้ากระดาษเพื่อเลือก หรือลากเพื่อขยับตำแหน่งได้ทันที
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setZoomLevel(Math.max(0.7, zoomLevel - 0.1))} 
                className="hover:text-white px-1 font-bold"
              >
                -
              </button>
              <span className="font-mono text-white text-[11px]">{Math.round(zoomLevel * 100)}%</span>
              <button 
                onClick={() => setZoomLevel(Math.min(1.4, zoomLevel + 0.1))} 
                className="hover:text-white px-1 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Paper Container */}
          <div className="w-full flex justify-center overflow-auto p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-inner">
            
            {viewMode === 'live-pdf' ? (
              <div 
                className="bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-700"
                style={{ width: `${595 * zoomLevel}px`, height: `${842 * zoomLevel}px` }}
              >
                <iframe
                  key={previewKey}
                  src={`${api.getPdfPreviewUrl(selectedPatient?.id || '')}&k=${previewKey}#toolbar=0&navpanes=0`}
                  className="w-full h-full"
                  title="PDF Live"
                />
              </div>
            ) : (
              /* Interactive Visual Paper Canvas */
              <div
                ref={canvasRef}
                className="relative bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-400 select-none"
                style={{
                  width: `${595 * zoomLevel}px`,
                  height: `${842 * zoomLevel}px`,
                  backgroundImage: `url('/template.pdf')`, // fallback visual
                }}
              >
                {/* Embed background PDF page visually */}
                <iframe
                  src="/template.pdf#toolbar=0&navpanes=0&scrollbar=0"
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
                  title="Template Background"
                />

                {/* Interactive Overlaid Draggable Fields */}
                {mappings.map((mapping) => {
                  const isSelected = mapping.id === selectedFieldId;
                  const rawVal = (selectedPatient as any)?.[mapping.key];
                  const displayVal = mapping.format 
                    ? mapping.format(rawVal, selectedPatient) 
                    : String(rawVal !== undefined && rawVal !== null ? rawVal : mapping.label);

                  const { left, top } = pdfToScreen(mapping.x, mapping.y);

                  return (
                    <div
                      key={mapping.id}
                      onMouseDown={(e) => handleMouseDown(e, mapping.id)}
                      style={{
                        left,
                        top,
                        fontSize: `${(mapping.fontSize || 14) * zoomLevel * 0.9}px`,
                        color: mapping.color || '#081d38',
                        fontFamily: mapping.fontFamily === 'Tahoma' ? 'Tahoma, sans-serif' : `'TH Sarabun New', sans-serif`,
                        fontWeight: mapping.isBold ? 700 : 400,
                        transform: 'translate(0, -65%)', // Baseline alignment
                      }}
                      className={`absolute cursor-move px-1 py-0.5 rounded transition-shadow ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-100/60 shadow-lg z-30 font-medium' 
                          : 'hover:ring-1 hover:ring-teal-400/80 hover:bg-teal-50/40 z-10'
                      }`}
                      title={`${mapping.label} (X: ${mapping.x}, Y: ${mapping.y})`}
                    >
                      {displayVal}

                      {/* Word-like resize handles on active field */}
                      {isSelected && (
                        <>
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
            )}
          </div>
        </div>

        {/* Right: Field List & Manual Customizer (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>คุณสมบัติข้อความ (Text Properties)</span>
              </span>
              <button
                onClick={loadMappings}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> คืนค่า
              </button>
            </h3>

            {activeField ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">ชื่อตำแหน่งฟิลด์</label>
                  <input
                    type="text"
                    value={activeField.label}
                    readOnly
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">พิกัด X (แนวนอน)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={activeField.x}
                      onChange={(e) => handleUpdateField(activeField.id, { x: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">พิกัด Y (แนวตั้ง)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={activeField.y}
                      onChange={(e) => handleUpdateField(activeField.id, { y: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ข้อความจำลอง / ปรับแก้ข้อความเอง</label>
                  <textarea
                    rows={2}
                    value={activeField.customText || ''}
                    placeholder="หากต้องการพิมพ์ข้อความใหม่แทนข้อมูลอัตโนมัติ..."
                    onChange={(e) => handleUpdateField(activeField.id, { customText: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  {activeField.customText && (
                    <button
                      onClick={() => handleUpdateField(activeField.id, { customText: undefined })}
                      className="text-[11px] text-teal-400 hover:underline mt-1"
                    >
                      คืนค่าเป็นข้อมูล Excel อัตโนมัติ
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick List of All Form Fields */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 h-[420px] overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              รายการฟิลด์ทั้งหมดในเอกสาร ({mappings.length})
            </h4>

            {mappings.map(m => {
              const isSelected = m.id === selectedFieldId;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedFieldId(m.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition text-xs flex items-center justify-between ${
                    isSelected 
                      ? 'bg-blue-950/60 border-blue-500/50 text-white shadow-sm' 
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{m.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      X: {m.x} | Y: {m.y} | Font: {m.fontSize}pt
                    </span>
                  </div>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
