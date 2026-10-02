import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { CookingDutyModal } from './CookingDutyModal';
import { 
  ChefHat, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Settings2, 
  Sparkles, 
  CalendarDays,
  ListOrdered,
  Plus,
  Utensils
} from 'lucide-react';

export function CookingDutyCard({ cookingData, onRefresh, onOpenAddMeal }) {
  const { currentUser, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!cookingData) return null;

  const { currentCook, nextCook, myDuty, queue = [] } = cookingData;

  const isMyTurn = myDuty?.isMyTurn;
  const turnsAway = myDuty?.turnsAway ?? null;

  const handleMarkDone = async (e) => {
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      const res = await api.completeCookingDuty(currentUser);
      showToast(res.message || 'Cooking duty handed over to the next person!');
      await onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to complete cooking duty', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="glass-card rounded-3xl p-5 border border-slate-800 shadow-glass overflow-hidden relative transition-all hover:border-slate-700">
        {/* Ambient subtle glow when it's your turn */}
        {isMyTurn && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-transparent pointer-events-none" />
        )}

        <div className="relative z-10 space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Cooking Duty Queue</h3>
                <p className="text-[11px] text-slate-400">Hostel daily meal rotation</p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors tap-active"
            >
              {isAdmin ? <Settings2 className="w-3.5 h-3.5" /> : <ListOrdered className="w-3.5 h-3.5" />}
              <span>{isAdmin ? 'Manage Order' : `Queue (${queue.length})`}</span>
            </button>
          </div>

          {/* Special Banner if it's the Logged-in User's turn! */}
          {isMyTurn ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👨‍🍳</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-300">
                      It's YOUR Turn to Cook Today!
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      You are in charge of today's hostel meals.
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 uppercase tracking-wider font-mono">
                  On Duty
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Next Cook in Line:</span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    {nextCook?.name || 'Next person'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  💡 When you record how much you spent on today's food, your turn is completed and handed over to <strong>{nextCook?.name}</strong> automatically.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenAddMeal?.()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-glow-green flex items-center justify-center gap-2 transition-all tap-active"
                >
                  <Utensils className="w-4 h-4" />
                  <span>+ Record Meal Expense (Finish My Turn)</span>
                </button>
              </div>

              {isAdmin && (
                <div className="pt-1 text-right">
                  <button
                    onClick={handleMarkDone}
                    disabled={isSubmitting}
                    className="text-[10px] text-slate-400 hover:text-amber-300 underline"
                  >
                    {isSubmitting ? 'Advancing...' : 'Admin: Emergency Skip / Handover without expense'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Standard View when someone else is cooking */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Today's Cook */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: currentCook?.avatar_color || '#f59e0b' }}
                  >
                    {currentCook ? currentCook.name.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                      Today's Cook
                    </span>
                    <span className="text-sm font-bold text-white block truncate">
                      {currentCook ? currentCook.name : 'Not set'}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleMarkDone}
                    disabled={isSubmitting}
                    className="shrink-0 p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition-all tap-active"
                    title="Admin: Mark current cook done and advance queue"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Next in Queue */}
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 opacity-80"
                    style={{ backgroundColor: nextCook?.avatar_color || '#3b82f6' }}
                  >
                    {nextCook ? nextCook.name.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Next (Tomorrow)
                    </span>
                    <span className="text-sm font-bold text-slate-200 block truncate">
                      {nextCook ? nextCook.name : 'Nobody'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    <Clock className="w-2.5 h-2.5 text-emerald-400" />
                    Tomorrow
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* User's position indicator in queue */}
          {!isMyTurn && turnsAway !== null && (
            <div className="flex items-center justify-between pt-1 px-1 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                Your cooking schedule:
              </span>
              <span className={`font-bold ${
                turnsAway === 1 
                  ? 'text-emerald-400' 
                  : turnsAway <= 3 
                    ? 'text-amber-300' 
                    : 'text-slate-300'
              }`}>
                {turnsAway === 1 ? '👉 Your turn is Tomorrow!' : `Your turn is in ${turnsAway} days`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cooking Queue Modal */}
      {isModalOpen && (
        <CookingDutyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cookingData={cookingData}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
