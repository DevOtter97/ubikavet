import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit2,
  User as UserIcon,
  Lock,
  Bell,
  FileText,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { petService, recordService, userService } from '../services/firestore';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ pets: 0, records: 0 });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    if (!user) return;
    const pets = await petService.getPets(user.id);
    let totalRecords = 0;
    await Promise.all(
      pets.map(async (p) => {
        const recs = await recordService.getRecords(user.id, p.id);
        totalRecords += recs.length;
      }),
    );
    setStats({ pets: pets.length, records: totalRecords });
  }

  async function handleSaveName() {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await userService.updateUser(user.id, { name: nameInput.trim() });
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <PageLayout className="bg-blue-gray-light flex flex-col">
      <header className="bg-white px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
        <h1 className="text-xl font-bold">Profile</h1>
        <button
          onClick={() => setEditingName(true)}
          className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"
        >
          <Edit2 size={20} />
        </button>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Avatar + Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-md mb-4">
            <UserIcon size={40} />
          </div>

          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-center outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button onClick={handleSaveName} disabled={savingName} className="size-7 rounded-full bg-primary text-white flex items-center justify-center">
                <Check size={14} />
              </button>
              <button onClick={() => { setEditingName(false); setNameInput(user?.name ?? ''); }} className="size-7 rounded-full bg-slate-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-bold">{user?.name || 'User'}</h2>
          )}
          <p className="text-slate-500 text-sm mt-1">{user?.email}</p>

          <div className="grid grid-cols-2 w-full gap-4 mt-6">
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pets</p>
              <p className="text-lg font-bold">{stats.pets}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Records</p>
              <p className="text-lg font-bold">{stats.records}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {[
            { icon: <UserIcon size={20} />, label: 'Personal Information' },
            { icon: <Lock size={20} />, label: 'Security' },
            { icon: <Bell size={20} />, label: 'Notification Settings' },
            { icon: <FileText size={20} />, label: 'Privacy Policy' },
          ].map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-slate-400">{item.icon}</div>
                <span className="font-medium text-slate-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-4 text-red-500 font-bold bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all"
        >
          Log Out
        </button>
      </main>

      <BottomNav active="profile" />
    </PageLayout>
  );
}
