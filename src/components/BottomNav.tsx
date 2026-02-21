import { Link } from 'react-router-dom';
import {
  Home as HomeIcon,
  Calendar,
  FileText,
  MapPin,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 flex justify-between items-end z-50">
      <Link to="/home" className={cn("flex flex-1 flex-col items-center gap-1 transition-colors", active === 'home' ? "text-primary" : "text-slate-400")}>
        <HomeIcon size={24} />
        <span className="text-[10px] font-semibold">Home</span>
      </Link>
      <Link to="/calendar" className={cn("flex flex-1 flex-col items-center gap-1 transition-colors", active === 'calendar' ? "text-primary" : "text-slate-400")}>
        <Calendar size={24} />
        <span className="text-[10px] font-medium">Calendar</span>
      </Link>
      <Link to="/records" className={cn("flex flex-1 flex-col items-center gap-1 transition-colors", active === 'records' ? "text-primary" : "text-slate-400")}>
        <FileText size={24} />
        <span className="text-[10px] font-medium">Records</span>
      </Link>
      <Link to="/map" className={cn("flex flex-1 flex-col items-center gap-1 transition-colors", active === 'map' ? "text-primary" : "text-slate-400")}>
        <MapPin size={24} />
        <span className="text-[10px] font-medium">Map</span>
      </Link>
      <Link to="/profile" className={cn("flex flex-1 flex-col items-center gap-1 transition-colors", active === 'profile' ? "text-primary" : "text-slate-400")}>
        <UserIcon size={24} />
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
