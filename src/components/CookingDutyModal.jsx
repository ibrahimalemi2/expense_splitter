import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { 
  X, 
  ChefHat, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  Clock, 
  FastForward, 
  History, 
  Home, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export function CookingDutyModal({ isOpen, onClose, cookingData, onRefresh }) {
  const { currentUser, isAdmin } = useAuth();

  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'history'

  if (!isOpen || !cookingData) return null;

  const { currentCook, queue = [], history = [] } = cookingData;

  // Move user up in queue
  const handleMove = async (index, direction) => {
    if (!isAdmin || isUpdating) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;

    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[targetIndex];
    newQueue[targetIndex] = temp;

    setIsUpdating(true);
    try {
      const orderedUserIds = newQueue.map(item => item.user_id);
      await api.reorderCookingQueue(orderedUserIds, currentUser);
      showToast('Cooking order updated!');
      await onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to reorder queue', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Set any user as today's cook
  const handleSetCurrentCook = async (userId, name) => {
    if (!isAdmin || isUpdating) return;
    setIsUpdating(true);
    try {
      await api.setCurrentCook(userId, currentUser);
      showToast(`Set ${name} as today's cook!`);
      await onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to update current cook', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Skip current cook
  const handleSkip = async () => {
    if (!isAdmin || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await api.skipCookingDuty(currentUser);
      showToast(res.message || 'Skipped to next cook!');
      await onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to skip cook', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Complete duty
  const handleComplete = async () => {
    setIsUpdating(true);
    try {
      const res = await api.completeCookingDuty(currentUser);
      showToast(res.message || 'Duty marked completed!');
      await onRefresh?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to complete duty', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const isCurrentCook = currentUser && currentCook && currentUser.id === currentCook.user_id;
  const canMarkDone = isCurrentCook || isAdmin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-5 border border-slate-800 shadow-glass my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Cooking Duty Queue</h2>
              <p className="text-xs text-slate-400">Hostel mess cooking rotation & turn schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Queue vs History */}
        <div className="flex items-center gap-2 mt-4 mb-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'queue'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rotation Queue ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>

        {activeTab === 'queue' ? (
          <div className="space-y-3">
            {/* Quick Action bar */}
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">On Duty Today:</span>
                <span className="font-bold text-amber-300">
                  {currentCook ? currentCook.name : 'None selected'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {canMarkDone && (
                  <button
                    onClick={handleComplete}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-glow-green transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={handleSkip}
                    disabled={isUpdating}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Skip current cook without recording completion"
                  >
                    <FastForward className="w-3.5 h-3.5" /> Skip
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <p className="text-[11px] text-slate-400 px-1">
                💡 <strong>Admin Tip:</strong> Use the ▲ / ▼ arrows to arrange the order, or click "Set Today" to choose who cooks right now.
              </p>
            )}

            {/* Queue List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {queue.map((item, idx) => {
                const isCurrent = item.is_current === 1;
                const isMe = currentUser && currentUser.id === item.user_id;

                return (
                  <div
                    key={item.user_id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-500/60 shadow-sm'
                        : isMe
                          ? 'bg-slate-800/60 border-slate-700'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Position Number & User info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCurrent 
                          ? 'bg-amber-500 text-slate-950 font-black' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>

                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                        style={{ backgroundColor: item.avatar_color || '#10b981' }}
                      >
                        {item.name.charAt(0)}
                      </div>

                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isCurrent ? 'text-amber-200' : 'text-slate-200'}`}>
                            {item.name} {isMe && '(You)'}
                          </span>
                          {item.status === 'at_home' && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 shrink-0">
                              🏠 Away
                            </span>
                          )}
                        </div>

                        {/* Turn timing badge */}
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          {isCurrent ? (
                            <span className="text-amber-400 font-bold flex items-center gap-0.5">
                              <ChefHat className="w-3 h-3" /> Today's Turn
                            </span>
                          ) : item.turnsAway === 1 ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> Tomorrow (Next)
                            </span>
                          ) : (
                            <span>In {item.turnsAway} days</span>
                          )}
                          {item.last_cooked_at && (
                            <span className="text-slate-500">• Last: {item.last_cooked_at}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Reorder & Set Today */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && !isCurrent && (
                        <button
                          onClick={() => handleSetCurrentCook(item.user_id, item.name)}
                          disabled={isUpdating}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-[10px] font-semibold border border-slate-700 transition-colors"
                          title="Set this person as today's cook"
                        >
                          Set Today
                        </button>
                      )}

                      {isAdmin && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0 || isUpdating}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === queue.length - 1 || isUpdating}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No cooking completions recorded yet.</p>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                      style={{ backgroundColor: h.avatar_color || '#10b981' }}
                    >
                      {h.cook_name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white block">{h.cook_name}</span>
                      <span className="text-[10px] text-slate-400">
                        Date: {h.date} {h.marked_by_name && `• Confirmed by ${h.marked_by_name}`}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 mt-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
