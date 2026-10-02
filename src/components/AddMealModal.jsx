import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { 
  X, 
  Utensils, 
  Moon, 
  Sun, 
  Coffee, 
  ShoppingCart, 
  Check, 
  Users, 
  Calculator, 
  AlertCircle,
  Home,
  Lock,
  ChefHat,
  CheckCircle2
} from 'lucide-react';

const MEAL_TYPES = [
  { id: 'Dinner', label: 'Dinner', icon: Moon, desc: 'Night meal' },
  { id: 'Lunch', label: 'Lunch', icon: Sun, desc: 'Afternoon meal' },
  { id: 'Breakfast', label: 'Breakfast', icon: Coffee, desc: 'Morning meal' },
  { id: 'General', label: 'General', icon: ShoppingCart, desc: 'Mess Grocery / Supplies' },
];

export function AddMealModal({ isOpen, onClose, onSuccess, cookingData }) {
  const { currentUser, users, isAdmin } = useAuth();

  const [amount, setAmount] = useState('');
  const [mealType, setMealType] = useState('Dinner'); // Dinner as default pill!
  const [payerId, setPayerId] = useState(currentUser?.id || '');
  const [adminChooseOther, setAdminChooseOther] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Cooking duty detection
  const currentCookId = cookingData?.currentCook?.user_id;
  const isCurrentCook = Boolean(currentCookId && Number(payerId) === Number(currentCookId));
  const nextCookName = cookingData?.nextCook?.name || 'the next member';

  // Initialize attendees: Active pre-checked, "At Home" unchecked
  useEffect(() => {
    if (isOpen && users.length > 0) {
      if (currentUser?.id) {
        setPayerId(currentUser.id);
      }
      setAdminChooseOther(false);
      // Pre-check active members only
      const initialChecked = users
        .filter(u => u.status === 'active')
        .map(u => u.id);
      
      setSelectedAttendees(initialChecked);
      setMealType('Dinner');
      setAmount('');
      setDescription('');
      setError('');
    }
  }, [isOpen, users, currentUser]);

  if (!isOpen) return null;

  // Toggle attendee
  const toggleAttendee = (userId) => {
    setSelectedAttendees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    setError('');
  };

  const selectAll = () => {
    setSelectedAttendees(users.map(u => u.id));
    setError('');
  };

  const selectOnlyActive = () => {
    setSelectedAttendees(users.filter(u => u.status === 'active').map(u => u.id));
    setError('');
  };

  const clearAll = () => {
    setSelectedAttendees([]);
  };

  // Live Math Calculation
  const numAmount = parseFloat(amount) || 0;
  const attendeeCount = selectedAttendees.length;
  const perPersonCost = attendeeCount > 0 ? Math.round((numAmount / attendeeCount) * 100) / 100 : 0;
  const payerIncluded = selectedAttendees.includes(Number(payerId));
  const payerPayerName = users.find(u => u.id === Number(payerId))?.name || 'Payer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than Rs. 0');
      return;
    }

    if (attendeeCount === 0) {
      setError('At least one attendee must be selected to split this meal.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.recordMeal({
        amount: numAmount,
        payer_id: Number(payerId),
        meal_type: mealType,
        date,
        description: description.trim() || undefined,
        attendee_ids: selectedAttendees
      }, currentUser);

      if (res?.dutyCompleted) {
        showToast(res.message || `Expense recorded! Cooking duty passed to ${res.nextCook}!`, 'success');
      } else {
        showToast(res?.message || `Recorded ${mealType} for Rs. ${numAmount}!`);
      }

      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record meal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-5 border border-slate-800 shadow-glass my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Record Meal / Mess Expense</h2>
              <p className="text-xs text-slate-400">Automatic per-head split & running balance credit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted Banner if this user is Today's Cook! */}
        {isCurrentCook && (
          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border border-amber-500/40 text-amber-200 text-xs space-y-1 animate-fade-in shadow-inner">
            <div className="flex items-center justify-between font-bold text-amber-300">
              <div className="flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Today's Cooking Duty Turn</span>
              </div>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 border border-amber-500/40">
                On Duty
              </span>
            </div>
            <p className="text-[11px] text-slate-300 pl-5 leading-snug">
              Adding how much you spent on today's meal will complete your cooking duty and automatically hand over the turn to <strong className="text-amber-300">{nextCookName}</strong>.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Total Amount (Rs.) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-emerald-400">
                Rs.
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 850"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xl font-black text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Meal Type Pills (Dinner as default) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meal Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MEAL_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = mealType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setMealType(type.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all tap-active ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-glow-green'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid By & Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Paid By *</span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Your Account Only
                </span>
              </label>

              {!isAdmin ? (
                /* Regular member (e.g. Atiqullah) ONLY sees their own name locked with avatar and (You) badge */
                <div className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: currentUser?.avatar_color || '#10b981' }}
                    >
                      {currentUser?.name ? currentUser.name.charAt(0) : '?'}
                    </div>
                    <span className="text-xs font-bold text-white truncate">
                      {currentUser?.name || 'You'}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    You
                  </span>
                </div>
              ) : (
                /* Admin view: defaults to Admin (You), with optional switch to record for offline roommates */
                <div>
                  {!adminChooseOther ? (
                    <div className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: currentUser?.avatar_color || '#10b981' }}
                        >
                          {currentUser?.name ? currentUser.name.charAt(0) : '?'}
                        </div>
                        <span className="text-xs font-bold text-white truncate">
                          {currentUser?.name} <span className="text-emerald-400 font-normal">(You / Admin)</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminChooseOther(true)}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 underline shrink-0 ml-1"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={payerId}
                        onChange={(e) => setPayerId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs font-medium text-slate-200 focus:outline-none"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.id === currentUser?.id ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminChooseOther(false);
                          setPayerId(currentUser?.id);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        ← Reset to You
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Items (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Special Chicken Biryani, Raita & Drinks"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Attendee Multi-Select Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Who Ate? (Attendees: {attendeeCount} of {users.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectOnlyActive}
                  className="text-[11px] font-medium text-emerald-400 hover:underline"
                >
                  Active Only
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-medium text-slate-400 hover:text-white"
                >
                  All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-400"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {users.map((u) => {
                const isChecked = selectedAttendees.includes(u.id);
                const isAtHome = u.status === 'at_home';

                return (
                  <div
                    key={u.id}
                    onClick={() => toggleAttendee(u.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all tap-active ${
                      isChecked
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold block truncate">
                          {u.name}
                        </span>
                      </div>
                    </div>

                    {isAtHome && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-0.5">
                        <Home className="w-2.5 h-2.5" /> At Home
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LIVE DYNAMIC SPLIT CALCULATOR PREVIEW */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-emerald-400" /> Split Breakdown:
              </span>
              {attendeeCount > 0 ? (
                <span className="font-bold text-emerald-400">
                  Rs. {perPersonCost} / person
                </span>
              ) : (
                <span className="font-semibold text-rose-400">
                  Select at least 1 person
                </span>
              )}
            </div>

            {numAmount > 0 && attendeeCount > 0 && (
              <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-800/80">
                <p>
                  • Rs. {numAmount} split equally among {attendeeCount} attendee{attendeeCount > 1 ? 's' : ''}.
                </p>
                <p>
                  • Payer ({payerPayerName}) gets credited:{' '}
                  <strong className="text-emerald-300">
                    {payerIncluded
                      ? `+Rs. ${Math.round((numAmount - perPersonCost) * 100) / 100} (Spent Rs. ${numAmount} - Own Share Rs. ${perPersonCost})`
                      : `+Rs. ${numAmount} (Did not eat this meal)`}
                  </strong>
                </p>
                <p>
                  • Each attendee account debited:{' '}
                  <strong className="text-rose-300">-Rs. {perPersonCost}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || attendeeCount === 0 || !numAmount}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-glow-green tap-active transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Recording Expense...'
              ) : isCurrentCook ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Rs. {numAmount || 0} & Handover Duty</span>
                </>
              ) : (
                `Confirm & Split Rs. ${numAmount || 0}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
