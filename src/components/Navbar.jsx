import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, LogOut, ShieldCheck, Home, Calendar, KeyRound, ScrollText } from 'lucide-react';

export function Navbar({ activeCycle, onOpenCycleModal, onOpenChangePin, onNavigateTab }) {
  const { currentUser, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Cycle Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-glow-green">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                Hostel Mess
              </h1>
              {activeCycle && (
                <button
                  onClick={onOpenCycleModal}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                  title="View cycle details"
                >
                  <Calendar className="w-3 h-3" />
                  Cycle #{activeCycle.cycle_number}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Expense & Meal Splitter
            </p>
          </div>
        </div>

        {/* User Pill, Change PIN & Switch / Logout */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenChangePin}
              title="Click to change your 4-digit PIN"
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-left"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: currentUser.avatar_color || '#10b981' }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200 leading-tight flex items-center gap-1">
                  {currentUser.name}
                  {isAdmin && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {isAdmin ? 'Admin' : 'Member'}
                </div>
              </div>
              {currentUser.status === 'at_home' && (
                <span className="hidden sm:inline-flex text-[10px] font-medium text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded">
                  <Home className="w-2.5 h-2.5 inline mr-0.5" /> Away
                </span>
              )}
            </button>

            {/* Quick Activity Logs */}
            <button
              onClick={() => onNavigateTab?.('logs')}
              title="Activity & Audit Logs (Never miss anything)"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-emerald-400 transition-colors tap-active"
            >
              <ScrollText className="w-4 h-4" />
            </button>

            {/* Quick Change PIN icon */}
            <button
              onClick={onOpenChangePin}
              title="Change your 4-digit PIN"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-emerald-400 transition-colors tap-active"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Switch User / Logout */}
            <button
              onClick={logout}
              title="Switch user or logout"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 transition-colors tap-active"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
