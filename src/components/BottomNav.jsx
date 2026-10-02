import React from 'react';
import { LayoutDashboard, ReceiptText, Plus, Scale, Users, ShieldCheck, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function BottomNav({ activeTab, onTabChange, onOpenAddMeal }) {
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all tap-active ${
            activeTab === 'dashboard'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] leading-none">Home</span>
        </button>

        {/* Tab 2: Meals Feed */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all tap-active ${
            activeTab === 'feed'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] leading-none">Meals</span>
        </button>

        {/* Center Button: + Add Meal */}
        <div className="-mt-6">
          <button
            onClick={onOpenAddMeal}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-glow-green hover:scale-105 active:scale-95 transition-all tap-active border-2 border-slate-950 p-3"
            title="Record New Meal"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Activity Logs */}
        <button
          onClick={() => onTabChange('logs')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all tap-active ${
            activeTab === 'logs'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScrollText className="w-5 h-5" />
          <span className="text-[10px] leading-none">Logs</span>
        </button>

        {/* Tab 4: Settlement */}
        <button
          onClick={() => onTabChange('settlement')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all tap-active ${
            activeTab === 'settlement'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-5 h-5" />
          <span className="text-[10px] leading-none">Settle</span>
        </button>

        {/* Tab 4: Admin & Members */}
        <button
          onClick={() => onTabChange('admin')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all tap-active ${
            activeTab === 'admin'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          <span className="text-[10px] leading-none">{isAdmin ? 'Admin' : 'Members'}</span>
        </button>
      </div>
    </nav>
  );
}
