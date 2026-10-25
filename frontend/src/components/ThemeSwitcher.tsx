import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Sparkles, ChevronDown, Check, Palette, Pipette } from 'lucide-react';

export type AppTheme = 'navy' | 'light' | 'slate';

interface ThemeOption {
  id: AppTheme;
  name: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
}

export interface AccentColor {
  name: string;
  hex: string;
  rgb: string;
  desc: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { name: 'Medical Teal', hex: '#14b8a6', rgb: '20, 184, 166', desc: 'มิ้นท์การแพทย์ (มาตรฐาน)' },
  { name: 'Royal Blue', hex: '#2563eb', rgb: '37, 99, 235', desc: 'น้ำเงินรอยัลบลู ภูมิฐาน' },
  { name: 'Clinical Emerald', hex: '#10b981', rgb: '16, 185, 129', desc: 'เขียวมรกต สุขภาพ' },
  { name: 'Sky Cyan', hex: '#06b6d4', rgb: '6, 182, 212', desc: 'ฟ้าไซอัน สดใสทันสมัย' },
  { name: 'Modern Violet', hex: '#8b5cf6', rgb: '139, 92, 246', desc: 'ม่วงไวโอเล็ต ล้ำสมัย' },
  { name: 'Warm Amber', hex: '#f59e0b', rgb: '245, 158, 11', desc: 'ส้มอำพัน อบอุ่นพรีเมียม' },
  { name: 'Rose Coral', hex: '#f43f5e', rgb: '244, 63, 94', desc: 'ชมพูกุหลาบ นุ่มนวล' },
  { name: 'Crimson Ruby', hex: '#dc2626', rgb: '220, 38, 38', desc: 'แดงทับทิม คมชัดโดดเด่น' },
];

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'navy',
    name: 'Executive Navy',
    sub: 'น้ำเงินกรมท่าลึก ประกายแสง Mesh นุ่มนวล',
    icon: Sparkles,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    badge: 'หรูหราพรีเมียม'
  },
  {
    id: 'light',
    name: 'Clinical Clean',
    sub: 'ขาวมุก สบายตา สไตล์เวชระเบียนสากล',
    icon: Sun,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    badge: 'โหมดสว่างสบายตา'
  },
  {
    id: 'slate',
    name: 'Minimal Slate',
    sub: 'เทาดำสุขุม สไตล์สตูดิโอแพทย์',
    icon: Moon,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    badge: 'ถนอมสายตา'
  }
];

export function applyAccentColor(hex: string) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(x => x + x).join('');
  const num = parseInt(clean, 16);
  if (isNaN(num)) return;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const sr = Math.min(255, Math.max(0, r + 20));
  const sg = Math.min(255, Math.max(0, g - 20));
  const sb = Math.min(255, Math.max(0, b + 40));

  document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
  document.documentElement.style.setProperty('--primary-hex', hex);
  document.documentElement.style.setProperty('--secondary-rgb', `${sr}, ${sg}, ${sb}`);
  localStorage.setItem('hospital_accent_hex', hex);
}

interface ThemeSwitcherProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  accentColor: string;
  onAccentChange: (hex: string) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ 
  currentTheme, 
  onThemeChange,
  accentColor,
  onAccentChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = THEME_OPTIONS.find(t => t.id === currentTheme) || THEME_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAccent = (hex: string) => {
    onAccentChange(hex);
    applyAccentColor(hex);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="theme-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white shadow-sm"
        title="เลือกโทนสีพื้นหลังและสีหลักของระบบ"
      >
        <div className="flex items-center space-x-1.5">
          <ActiveIcon className="w-3.5 h-3.5 text-slate-300" />
          {/* Active Color Dot */}
          <span 
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 transition-transform duration-200"
            style={{ backgroundColor: accentColor }}
          />
        </div>
        <span className="font-semibold tracking-tight">{activeOption.name}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel shadow-2xl border border-slate-700/80 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Section 1: Background Theme */}
          <div className="mb-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>1. สไตล์พื้นหลัง (Theme Style)</span>
              </span>
            </div>

            <div className="space-y-1">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = opt.id === currentTheme;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onThemeChange(opt.id)}
                    className={`w-full flex items-center space-x-3 p-2 rounded-xl transition text-left ${
                      isSelected
                        ? 'bg-slate-700/50 border text-white'
                        : 'hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent'
                    }`}
                    style={isSelected ? { borderColor: `${accentColor}60` } : {}}
                  >
                    <div className={`p-1.5 rounded-lg border ${opt.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{opt.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                          isSelected ? 'bg-slate-800 text-white' : 'text-slate-400'
                        }`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{opt.sub}</p>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-700/60 my-2"></div>

          {/* Section 2: Accent Color & Glow */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>2. เฉดสีหลัก & ประกายแสง (Accent Glow)</span>
              </span>
            </div>

            {/* Color Grid */}
            <div className="grid grid-cols-4 gap-2 mb-2.5">
              {ACCENT_COLORS.map((c) => {
                const isSelected = accentColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    onClick={() => handleSelectAccent(c.hex)}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-150 ${
                      isSelected 
                        ? 'bg-slate-700/50 shadow-md ring-1' 
                        : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50'
                    }`}
                    style={isSelected ? { borderColor: c.hex, boxShadow: `0 0 0 1px ${c.hex}` } : {}}
                    title={`${c.name} - ${c.desc}`}
                  >
                    <span 
                      className="w-5 h-5 rounded-full shadow-inner flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium mt-1 truncate max-w-full">
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <div className="flex items-center space-x-2">
                <Pipette className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-300 font-medium">เลือกสีอิสระ (Custom Picker):</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleSelectAccent(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  title="คลิกเพื่อเลือกสีเองแบบละเอียด"
                />
                <span className="font-mono text-[10px] text-slate-400 uppercase">{accentColor}</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
