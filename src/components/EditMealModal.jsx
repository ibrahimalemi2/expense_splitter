import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { X, Edit3, Users, Moon, Sun, Coffee, ShoppingCart, Check, AlertCircle } from 'lucide-react';

const MEAL_TYPES = [
  { id: 'Dinner', label: 'Dinner', icon: Moon },
  { id: 'Lunch', label: 'Lunch', icon: Sun },
  { id: 'Breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'General', label: 'General', icon: ShoppingCart },
];

export function EditMealModal({ meal, isOpen, onClose, onSuccess }) {
  const { currentUser, users } = useAuth();

  const [amount, setAmount] = useState('');
  const [mealType, setMealType] = useState('Dinner');
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (meal && isOpen) {
      setAmount(String(meal.amount));
      setMealType(meal.meal_type || 'Dinner');
      setPayerId(String(meal.payer_id));
      setDate(meal.date || new Date().toISOString().split('T')[0]);
      setDescription(meal.description || '');
      setSelectedAttendees(meal.attendees ? meal.attendees.map(a => a.user_id) : []);
      setError('');
    }
  }, [meal, isOpen]);

  if (!isOpen || !meal) return null;

  const toggleAttendee = (userId) => {
    setSelectedAttendees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const numAmount = parseFloat(amount) || 0;
  const attendeeCount = selectedAttendees.length;
  const perPersonCost = attendeeCount > 0 ? Math.round((numAmount / attendeeCount) * 100) / 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (attendeeCount === 0) {
      setError('Please select at least one attendee.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateMeal(meal.id, {
        payer_id: Number(payerId),
        amount: numAmount,
        meal_type: mealType,
        date,
        description: description.trim() || undefined,
        attendee_ids: selectedAttendees
      }, currentUser);

      showToast('Meal updated successfully by admin!');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update meal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-5 border border-slate-800 shadow-glass my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Admin Edit Meal</h2>
              <p className="text-xs text-slate-400">Correct typo, amount, or attendee split</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Amount (Rs.) *
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-amber-500 text-lg font-bold text-white focus:outline-none"
            />
          </div>

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
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payer
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Attendees ({attendeeCount} selected • Rs. {perPersonCost}/head)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {users.map((u) => {
                const isChecked = selectedAttendees.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleAttendee(u.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs ${
                      isChecked
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{u.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || attendeeCount === 0}
              className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
