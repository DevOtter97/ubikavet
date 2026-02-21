import { useState, useEffect } from 'react';
import { Plus, Syringe, Stethoscope, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { petService, appointmentService } from '../services/firestore';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { MiniCalendar } from '../components/MiniCalendar';
import { AppointmentFormModal } from '../components/modals/AppointmentFormModal';
import type { Appointment, Pet } from '../types';

export default function CalendarPage() {
  const { user } = useAuth();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      appointmentService.getAppointments(user.id),
      petService.getPets(user.id),
    ]).then(([a, p]) => {
      setAppointments(a);
      setPets(p);
      setLoading(false);
    });
  }, [user]);

  async function handleAddAppointment(data: Omit<Appointment, 'id'>) {
    if (!user) return;
    const id = await appointmentService.addAppointment(user.id, data);
    setAppointments(prev => [...prev, { ...data, id }].sort((a, b) => a.date.localeCompare(b.date)));
  }

  async function handleDelete(appointmentId: string) {
    if (!user) return;
    await appointmentService.deleteAppointment(user.id, appointmentId);
    setAppointments(prev => prev.filter(a => a.id !== appointmentId));
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const markedDates = appointments.map(a => a.date);
  const dayAppointments = appointments.filter(a => a.date === selectedDate);
  const upcoming = appointments.filter(a => a.date >= new Date().toISOString().split('T')[0]);

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${period}`;
  }

  return (
    <PageLayout className="bg-blue-gray-light flex flex-col">
      <header className="bg-white px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
        <h1 className="text-xl font-bold">Calendar</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"
        >
          <Plus size={24} />
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar pb-24">
        <MiniCalendar
          year={year}
          month={month}
          markedDates={markedDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />

        {/* Appointments for selected date */}
        {dayAppointments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {dayAppointments.map(app => (
              <div key={app.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                <div className={cn(
                  'size-11 rounded-xl flex items-center justify-center shrink-0',
                  app.type === 'Vaccination' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-600',
                )}>
                  {app.type === 'Vaccination' ? <Syringe size={22} /> : <Stethoscope size={22} />}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{app.type}</h4>
                  <p className="text-xs text-slate-500">{app.petName} &bull; {formatTime(app.time)}</p>
                  {app.clinic && <p className="text-xs text-slate-400">{app.clinic}</p>}
                </div>
                <button onClick={() => handleDelete(app.id)} className="text-slate-300 hover:text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming section */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">No upcoming appointments. Tap + to add one.</p>
            ) : (
              upcoming.slice(0, 10).map(app => (
                <div key={app.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className={cn(
                    'size-12 rounded-xl flex items-center justify-center shrink-0',
                    app.type === 'Vaccination' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-600',
                  )}>
                    {app.type === 'Vaccination' ? <Syringe size={24} /> : <Stethoscope size={24} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">{app.type}</h4>
                    <p className="text-xs text-slate-500">{app.petName} &bull; {formatTime(app.time)}</p>
                    {app.clinic && <p className="text-xs text-slate-400">{app.clinic}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      {MONTH_ABBR[Number(app.date.split('-')[1]) - 1]}
                    </p>
                    <p className="text-lg font-bold text-slate-700 leading-none">{app.date.split('-')[2]}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <BottomNav active="calendar" />

      {showAdd && (
        <AppointmentFormModal
          pets={pets}
          defaultDate={selectedDate}
          onSave={handleAddAppointment}
          onClose={() => setShowAdd(false)}
        />
      )}
    </PageLayout>
  );
}
