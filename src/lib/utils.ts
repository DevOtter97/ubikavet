import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { VaccineStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeVaccineStatus(dueDateStr: string): VaccineStatus {
  const days = (new Date(dueDateStr).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'overdue';
  if (days <= 30) return 'due-soon';
  return 'up-to-date';
}

// Parses OSM opening_hours string and returns:
//   true  → currently open
//   false → currently closed
//   null  → unknown / couldn't parse
export function isCurrentlyOpen(ohStr: string | null | undefined): boolean | null {
  if (!ohStr) return null;
  const str = ohStr.trim().toLowerCase();
  if (str === '24/7') return true;
  if (str === 'closed' || str === 'off') return false;

  const DAY: Record<string, number> = {
    mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6, su: 0,
  };

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun … 6=Sat
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const inTimeRange = (from: number, to: number) =>
    to > from ? currentMin >= from && currentMin < to
              : currentMin >= from || currentMin < to; // overnight

  const dayMatches = (dayPart: string): boolean => {
    for (const seg of dayPart.split(',')) {
      const s = seg.trim();
      if (s.includes('-')) {
        const [a, b] = s.split('-');
        const from = DAY[a.trim()], to = DAY[b.trim()];
        if (from === undefined || to === undefined) continue;
        if (from <= to ? currentDay >= from && currentDay <= to
                       : currentDay >= from || currentDay <= to) return true;
      } else {
        if (DAY[s.trim()] === currentDay) return true;
      }
    }
    return false;
  };

  try {
    const rules = str.split(';').map(r => r.trim()).filter(Boolean);
    for (const rule of rules) {
      // Rule with day specifier: "mo-fr 09:00-18:00" or "sa off"
      const withDay = rule.match(/^([a-z,\-]+)\s+(.+)$/);
      if (withDay) {
        if (!dayMatches(withDay[1])) continue;
        const timePart = withDay[2].trim();
        if (timePart === 'off' || timePart === 'closed') return false;
        for (const tr of timePart.split(',')) {
          const m = tr.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
          if (m && inTimeRange(toMin(m[1]), toMin(m[2]))) return true;
        }
        return false; // day matched but no time range matched → closed now
      }

      // Rule without day specifier: "09:00-18:00" (applies every day)
      for (const tr of rule.split(',')) {
        const m = tr.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
        if (m && inTimeRange(toMin(m[1]), toMin(m[2]))) return true;
      }
    }
    return null;
  } catch {
    return null;
  }
}
