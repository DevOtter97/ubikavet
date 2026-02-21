import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  year: number;
  month: number; // 0-indexed
  markedDates?: string[]; // 'YYYY-MM-DD'
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MiniCalendar({
  year,
  month,
  markedDates = [],
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const today = new Date().toISOString().split('T')[0];

  // Day-of-week the 1st falls on (0=Sun)
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">{MONTH_NAMES[month]} {year}</h2>
        <div className="flex gap-1">
          <button onClick={onPrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAY_LABELS.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = dateStr(day);
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const hasAppointment = markedDates.includes(ds);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(ds)}
              className={cn(
                'aspect-square flex flex-col items-center justify-center text-sm font-medium rounded-lg relative transition-colors',
                isSelected ? 'bg-primary text-white' : isToday ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50',
              )}
            >
              {day}
              {hasAppointment && (
                <span className={cn(
                  'absolute bottom-0.5 size-1.5 rounded-full',
                  isSelected ? 'bg-white/80' : 'bg-primary',
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
