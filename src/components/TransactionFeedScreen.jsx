import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { EditMealModal } from './EditMealModal';
import { 
  Search, 
  Filter, 
  Moon, 
  Sun, 
  Coffee, 
  ShoppingCart, 
  Users, 
  Lock, 
  Edit3, 
  Trash2, 
  Calendar, 
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const MEAL_ICONS = {
  Dinner: { icon: Moon, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  Lunch: { icon: Sun, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  Breakfast: { icon: Coffee, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  General: { icon: ShoppingCart, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
};

export function TransactionFeedScreen({ meals = [], onRefresh, activeCycle }) {
  const { currentUser, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter meals
  const filteredMeals = meals.filter((meal) => {
    const matchesType = selectedType === 'All' || meal.meal_type === selectedType;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      meal.description?.toLowerCase().includes(q) ||
      meal.payer_name?.toLowerCase().includes(q) ||
      meal.meal_type?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Admin Confirm: Are you sure you want to delete this meal entry? Balances will be recalculated.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteMeal(mealId, currentUser);
      showToast('Meal entry deleted and balances updated!');
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to delete meal', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (mealId) => {
    setExpandedMealId(prev => (prev === mealId ? null : mealId));
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header & Immutability Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Transaction Feed & Meals
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {filteredMeals.length} Entries
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            {activeCycle ? `Showing records for Cycle #${activeCycle.cycle_number}` : 'All cycle records'}
          </p>
        </div>

        {/* Security / Tamper Notice */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 self-start sm:self-auto">
          {isAdmin ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Mode: Edit & Delete Enabled
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-500" /> Member Mode: Entries Immutable
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by description, payer name, or meal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'Dinner', 'Lunch', 'Breakfast', 'General'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active ${
                selectedType === type
                  ? 'bg-emerald-500 text-slate-950 shadow-glow-green'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Meals List */}
      {filteredMeals.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 text-slate-400">
          <p className="text-sm font-semibold">No meals found matching your criteria</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing search filters or add a new meal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeals.map((meal) => {
            const typeConfig = MEAL_ICONS[meal.meal_type] || MEAL_ICONS.General;
            const Icon = typeConfig.icon;
            const isExpanded = expandedMealId === meal.id;

            return (
              <div
                key={meal.id}
                className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Main Card Summary */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Meal Type Icon */}
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {meal.meal_type}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {meal.date}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-200 mt-0.5">
                        {meal.description || `${meal.meal_type} meal`}
                      </h4>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>
                          Paid by <strong className="text-slate-300">{meal.payer_name}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">
                          Rs. {meal.perPersonCost}/head
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {meal.attendeeCount} eaters
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Amount & Actions */}
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-white block">
                      Rs. {meal.amount}
                    </span>

                    {/* Admin Actions: Edit & Delete (Only shown to Admin) */}
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1.5 mt-2">
                        <button
                          onClick={() => setEditingMeal(meal)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
                          title="Edit meal (Admin)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                          title="Delete meal (Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-end gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Immutable
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand / Collapse Attendees Button */}
                <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => toggleExpand(meal.id)}
                    className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Who ate this meal? ({meal.attendees?.length || 0})</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Share: Rs. {meal.perPersonCost} ea.
                  </span>
                </div>

                {/* Expanded Attendees List */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-slate-950/70 border-t border-slate-800 space-y-1.5 animate-fade-in">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">
                      Individual Share Breakdown:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {meal.attendees?.map((att) => {
                        const isPayer = att.user_id === meal.payer_id;
                        return (
                          <div
                            key={att.user_id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white"
                                style={{ backgroundColor: att.avatar_color || '#10b981' }}
                              >
                                {att.name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-200">
                                {att.name} {isPayer && '(Payer)'}
                              </span>
                            </div>
                            <span className="font-bold text-rose-300">
                              -Rs. {att.share_amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Edit Modal */}
      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          isOpen={Boolean(editingMeal)}
          onClose={() => setEditingMeal(null)}
          onSuccess={() => {
            setEditingMeal(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
