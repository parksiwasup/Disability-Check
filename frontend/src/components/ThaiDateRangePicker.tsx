import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RotateCcw, 
  Check, 
  ArrowRight,
  CalendarDays
} from 'lucide-react';

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** Normalize any incoming date string (CE or BE) to ISO 'YYYY-MM-DD' */
export function normalizeDateToISO(rawDate?: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();
  const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    let year = parseInt(match[1], 10);
    const month = String(parseInt(match[2], 10)).padStart(2, '0');
    const day = String(parseInt(match[3], 10)).padStart(2, '0');
    if (year > 2400) {
      year -= 543;
    }
    return `${year}-${month}-${day}`;
  }
  return '';
}

/** Format YYYY-MM-DD to Thai string (e.g. 26 ต.ค. 2567) */
export function formatThaiDate(dateStr: string, shortMonth = true): string {
  if (!dateStr) return '';
  const iso = normalizeDateToISO(dateStr) || dateStr.trim();
  const parts = iso.split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10) + 543;
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const monthName = shortMonth ? THAI_MONTHS_SHORT[m] : THAI_MONTHS_FULL[m];
  return `${d} ${monthName || ''} ${y}`;
}

/** Convert a Date object to local YYYY-MM-DD string */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ThaiDateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD' or ''
  endDate: string;   // 'YYYY-MM-DD' or ''
  onChange: (start: string, end: string) => void;
  activeDatesWithData?: Set<string>;
  totalCount?: number;
  filteredCount?: number;
}

export const ThaiDateRangePicker: React.FC<ThaiDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  activeDatesWithData = new Set(),
  filteredCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view date
  const [viewDate, setViewDate] = useState<Date>(() => {
    const target = startDate || endDate;
    if (target) {
      const [y, m] = target.split('-').map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Mode for switching months/years view
  const [viewMode, setViewMode] = useState<'calendar' | 'months' | 'years'>('calendar');

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setViewMode('calendar');
      const target = startDate || endDate;
      if (target) {
        const [y, m] = target.split('-').map(Number);
        if (y && m) setViewDate(new Date(y, m - 1, 1));
      }
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0-11
  const thaiBuddhistYear = viewYear + 543;

  const currentCEYear = new Date().getFullYear();
  const yearRange = useMemo(() => {
    const years: number[] = [];
    for (let y = currentCEYear - 6; y <= currentCEYear + 3; y++) {
      years.push(y);
    }
    return years;
  }, [currentCEYear]);

  // Calendar cells calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = toISODate(new Date());

    // Padding previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, day);
      const str = toISODate(prevDate);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: str === todayStr
      });
    }

    // Current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const curDate = new Date(viewYear, viewMonth, day);
      const str = toISODate(curDate);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: str === todayStr
      });
    }

    // Padding next month
    const remainingCells = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(viewYear, viewMonth + 1, day);
      const str = toISODate(nextDate);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: str === todayStr
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd(tempStart);
        onChange(dateStr, tempStart);
      } else {
        setTempEnd(dateStr);
        onChange(tempStart, dateStr);
      }
      setIsOpen(false);
    }
  };

  const applyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'prevMonth' | 'all') => {
    const now = new Date();
    const todayStr = toISODate(now);

    switch (preset) {
      case 'today':
        setTempStart(todayStr);
        setTempEnd(todayStr);
        onChange(todayStr, todayStr);
        setIsOpen(false);
        break;

      case 'yesterday': {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        const yestStr = toISODate(yest);
        setTempStart(yestStr);
        setTempEnd(yestStr);
        onChange(yestStr, yestStr);
        setIsOpen(false);
        break;
      }

      case 'last7': {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        const startStr = toISODate(start);
        setTempStart(startStr);
        setTempEnd(todayStr);
        onChange(startStr, todayStr);
        setIsOpen(false);
        break;
      }

      case 'thisMonth': {
        const startStr = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
        const endStr = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        setTempStart(startStr);
        setTempEnd(endStr);
        onChange(startStr, endStr);
        setIsOpen(false);
        break;
      }

      case 'prevMonth': {
        const startStr = toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const endStr = toISODate(new Date(now.getFullYear(), now.getMonth(), 0));
        setTempStart(startStr);
        setTempEnd(endStr);
        onChange(startStr, endStr);
        setIsOpen(false);
        break;
      }

      case 'all':
        setTempStart('');
        setTempEnd('');
        onChange('', '');
        setIsOpen(false);
        break;
    }
  };

  const handleApply = () => {
    if (tempStart && !tempEnd) {
      onChange(tempStart, tempStart);
    } else {
      onChange(tempStart, tempEnd);
    }
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTempStart('');
    setTempEnd('');
    onChange('', '');
    setIsOpen(false);
  };

  const isFilterActive = Boolean(startDate || endDate);
  const todayStr = toISODate(new Date());

  const displayText = useMemo(() => {
    if (!startDate && !endDate) {
      return 'ปฏิทินไทย';
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        return startDate === todayStr ? 'วันนี้' : formatThaiDate(startDate);
      }
      return `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;
    }
    if (startDate) {
      return `ตั้งแต่ ${formatThaiDate(startDate)}`;
    }
    return `ถึง ${formatThaiDate(endDate)}`;
  }, [startDate, endDate, todayStr]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button - Clean & Modern */}
      <button
        type="button"
        id="thai-date-range-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-sm select-none border ${
          isFilterActive
            ? 'bg-teal-500/15 border-teal-500/60 text-teal-300 hover:bg-teal-500/25'
            : 'bg-slate-800/90 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white'
        }`}
        title="เลือกช่วงวันที่ตรวจรักษา (แบบปฏิทินไทย พ.ศ.)"
      >
        <CalendarIcon className={`w-3.5 h-3.5 flex-shrink-0 transition ${isFilterActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-teal-400'}`} />
        <span className="whitespace-nowrap font-medium">{displayText}</span>
        {isFilterActive && filteredCount !== undefined && (
          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.2 rounded-full text-[10px] font-semibold">
            {filteredCount}
          </span>
        )}
        {isFilterActive && (
          <span
            onClick={handleClear}
            className="p-0.5 hover:bg-teal-800/70 text-teal-300 hover:text-white rounded-full transition ml-0.5"
            title="ล้างช่วงวันที่"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Popover Calendar Modal - Clean, Streamlined & Beautiful */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-2 z-50 w-[308px] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3.5 text-slate-200 backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Row: Title & Month/Year Switcher */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/90">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Clickable Month & Year Header */}
            <div className="flex items-center space-x-1.5 font-bold text-xs">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'calendar' : 'months')}
                className="px-2 py-1 rounded-md hover:bg-slate-800 text-white hover:text-teal-300 transition cursor-pointer"
              >
                {THAI_MONTHS_FULL[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'calendar' : 'years')}
                className="px-2 py-1 rounded-md hover:bg-slate-800 text-teal-400 hover:text-teal-300 transition cursor-pointer"
              >
                พ.ศ. {thaiBuddhistYear}
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer ml-1"
                title="ปิด"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Presets Row - Streamlined Single Row */}
          <div className="flex items-center gap-1 my-2.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border text-center whitespace-nowrap ${
                tempStart === todayStr && tempEnd === todayStr
                  ? 'bg-teal-500 text-white border-teal-400 font-semibold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => applyPreset('yesterday')}
              className="px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border text-center whitespace-nowrap bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white"
            >
              เมื่อวาน
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last7')}
              className="px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border text-center whitespace-nowrap bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white"
            >
              7 วัน
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisMonth')}
              className="px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border text-center whitespace-nowrap bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white"
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => applyPreset('prevMonth')}
              className="px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border text-center whitespace-nowrap bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white"
            >
              เดือนก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border text-center whitespace-nowrap ${
                !tempStart && !tempEnd
                  ? 'bg-teal-500 text-white border-teal-400 font-semibold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white'
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          {/* Range Selected Status Badge */}
          <div className="bg-slate-800/50 rounded-xl px-2.5 py-1.5 border border-slate-700/50 mb-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">ช่วงวันที่:</span>
            <div className="flex items-center space-x-1.5 font-semibold text-teal-300">
              {tempStart ? (
                <>
                  <span>{formatThaiDate(tempStart)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className={tempEnd ? 'text-teal-300' : 'text-amber-400 animate-pulse font-normal'}>
                    {tempEnd ? formatThaiDate(tempEnd) : 'เลือกวันสิ้นสุด...'}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 font-normal">คลิกเลือกวันเริ่มต้น - สิ้นสุด</span>
              )}
            </div>
          </div>

          {/* Quick Month Grid Selector View */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-1.5 py-2">
              {THAI_MONTHS_FULL.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(viewYear, idx, 1));
                    setViewMode('calendar');
                  }}
                  className={`py-2 px-1 text-xs rounded-xl font-medium transition cursor-pointer border ${
                    idx === viewMonth
                      ? 'bg-teal-500 text-white border-teal-400 font-bold'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Quick Year Grid Selector View */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-1.5 py-2">
              {yearRange.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(y, viewMonth, 1));
                    setViewMode('calendar');
                  }}
                  className={`py-2 px-1 text-xs rounded-xl font-medium transition cursor-pointer border ${
                    y === viewYear
                      ? 'bg-teal-500 text-white border-teal-400 font-bold'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  พ.ศ. {y + 543}
                </button>
              ))}
            </div>
          )}

          {/* Standard Calendar Grid */}
          {viewMode === 'calendar' && (
            <div>
              {/* Day of week headers */}
              <div className="grid grid-cols-7 mb-1 text-center">
                {THAI_DAYS_SHORT.map((day, idx) => (
                  <div
                    key={day}
                    className={`text-[10px] font-semibold py-0.5 ${
                      idx === 0 ? 'text-rose-400/90' : idx === 6 ? 'text-amber-400/90' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {calendarCells.map((cell) => {
                  const { dateStr, dayNumber, isCurrentMonth, isToday } = cell;
                  const hasData = activeDatesWithData.has(dateStr);

                  const isStart = tempStart === dateStr;
                  const isEnd = tempEnd === dateStr;
                  const isSingle = isStart && isEnd;

                  const effectiveEnd = tempEnd || (hoverDate && hoverDate >= tempStart ? hoverDate : '');
                  const isInRange = 
                    tempStart && 
                    effectiveEnd && 
                    dateStr >= tempStart && 
                    dateStr <= effectiveEnd;

                  let cellBg = '';
                  let cellText = isCurrentMonth ? 'text-slate-200' : 'text-slate-600 opacity-40';
                  let round = 'rounded-lg';

                  if (isSingle) {
                    cellBg = 'bg-teal-500 text-white shadow-sm shadow-teal-500/40';
                    round = 'rounded-xl';
                    cellText = 'text-white font-bold';
                  } else if (isStart) {
                    cellBg = 'bg-teal-500 text-white shadow-sm shadow-teal-500/40';
                    round = 'rounded-l-xl rounded-r-none';
                    cellText = 'text-white font-bold';
                  } else if (isEnd) {
                    cellBg = 'bg-teal-500 text-white shadow-sm shadow-teal-500/40';
                    round = 'rounded-r-xl rounded-l-none';
                    cellText = 'text-white font-bold';
                  } else if (isInRange) {
                    cellBg = 'bg-teal-500/20 text-teal-200';
                    round = 'rounded-none';
                    cellText = 'text-teal-200 font-medium';
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleDayClick(dateStr)}
                      onMouseEnter={() => {
                        if (tempStart && !tempEnd) {
                          setHoverDate(dateStr);
                        }
                      }}
                      onMouseLeave={() => setHoverDate(null)}
                      className={`relative h-7 flex flex-col items-center justify-center text-xs transition cursor-pointer select-none ${cellBg} ${round} ${
                        !isStart && !isEnd && !isInRange ? 'hover:bg-slate-800' : ''
                      }`}
                    >
                      <span className={`leading-none ${cellText}`}>{dayNumber}</span>

                      {/* Today dot indicator */}
                      {isToday && !isStart && !isEnd && (
                        <span className="w-1 h-1 rounded-full bg-teal-400 mt-0.5" />
                      )}

                      {/* Patient record data indicator */}
                      {hasData && !isStart && !isEnd && !isToday && (
                        <span
                          className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5"
                          title="มีเวชระเบียน"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-slate-800/90 pt-2.5 mt-2.5 text-xs">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>มีคนไข้</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => handleClear()}
                className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ล้างค่า</span>
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow cursor-pointer ${
                  tempStart
                    ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>ตกลง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
