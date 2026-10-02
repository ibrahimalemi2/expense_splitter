import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CookingDutyCard } from './CookingDutyCard';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Users, 
  Utensils, 
  Plus, 
  ArrowRight, 
  Home, 
  CheckCircle, 
  Sparkles,
  RefreshCw,
  ScrollText,
  Clock
} from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recent';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function DashboardScreen({ dashboardData, cookingData, recentLogs = [], onOpenAddMeal, onNavigateTab, onRefresh, isLoading }) {
  const { currentUser } = useAuth();

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
        <p className="text-sm">Loading mess dashboard...</p>
      </div>
    );
  }

  const { personalCard, stats, roommates = [], recentMeals = [] } = dashboardData;

  const isOwed = personalCard?.isOwed;
  const owes = personalCard?.owes;
  const isEven = personalCard?.isEven;
  const netAmount = Math.abs(personalCard?.netBalance || 0);

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* 1. PERSONAL STATUS CARD (High Impact Green/Red Badge) */}
      <div className="relative overflow-hidden rounded-3xl p-5 shadow-glass border transition-all">
        {isOwed && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30" />
        )}
        {owes && (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-950 border border-rose-500/30" />
        )}
        {isEven && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800" />
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Personal Mess Status
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              isOwed 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-green'
                : owes
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-glow-red'
                  : 'bg-slate-800 text-slate-300'
            }`}>
              {isOwed && <TrendingUp className="w-3.5 h-3.5" />}
              {owes && <TrendingDown className="w-3.5 h-3.5" />}
              {isEven && <CheckCircle className="w-3.5 h-3.5" />}
              {isOwed ? 'In Credit' : owes ? 'Debt Pending' : 'All Clear'}
            </span>
          </div>

          {/* Big Green / Red Badge */}
          <div className="my-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1.5">
              <span className={isOwed ? 'text-emerald-400' : owes ? 'text-rose-400' : 'text-slate-200'}>
                {isOwed ? 'You are owed' : owes ? 'You owe' : 'Even balance'}
              </span>
              <span className={`text-3xl sm:text-4xl font-black ${
                isOwed ? 'text-emerald-300' : owes ? 'text-rose-400' : 'text-slate-100'
              }`}>
                Rs. {netAmount.toLocaleString()}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isOwed
                ? 'The mess / your roommates owe you this amount.'
                : owes
                  ? 'You need to pay this amount into the mess pool / to creditors.'
                  : 'You have paid exactly what you consumed this cycle.'}
            </p>
          </div>

          {/* Spent vs Consumed metrics */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
            <div className="bg-slate-900/60 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Spent</span>
              <span className="text-sm font-bold text-white">Rs. {personalCard?.totalSpent || 0}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Eaten / Share</span>
              <span className="text-sm font-bold text-slate-300">Rs. {personalCard?.totalConsumed || 0}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Carry In</span>
              <span className="text-sm font-bold text-slate-400">Rs. {personalCard?.carryOverIn || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. COOKING DUTY ROSTER CARD */}
      {cookingData && (
        <CookingDutyCard
          cookingData={cookingData}
          onRefresh={onRefresh}
          onOpenAddMeal={onOpenAddMeal}
        />
      )}

      {/* 3. QUICK ACTION & STATS GRID */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenAddMeal}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-glow-green tap-active transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          Record New Meal
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors tap-active"
          title="Refresh dashboard"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Coins className="w-4 h-4 text-emerald-400" />
            Total Cycle Pool
          </div>
          <div className="text-xl font-black text-white">
            Rs. {stats?.totalPool?.toLocaleString() || 0}
          </div>
          <span className="text-[11px] text-slate-400">
            {stats?.mealCount || 0} meals logged
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Users className="w-4 h-4 text-sky-400" />
            Active Eaters Today
          </div>
          <div className="text-xl font-black text-white flex items-baseline gap-1">
            <span>{stats?.activeEatersToday || 0}</span>
            <span className="text-xs text-slate-400 font-normal">/ {stats?.totalActiveMembers || 0} active</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">
            Roommates eating
          </span>
        </div>
      </div>

      {/* 3. ROOMMATES RUNNING BALANCES LIST */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Roommates Running Balances</h3>
          </div>
          <button
            onClick={() => onNavigateTab('settlement')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
          >
            Settle Matrix <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {roommates.map((user) => {
            const isMe = user.id === currentUser?.id;
            const net = Math.round((user.net_balance || 0) * 100) / 100;
            const owesMoney = net < -0.01;
            const isOwedMoney = net > 0.01;

            return (
              <div
                key={user.id}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  isMe ? 'bg-slate-800/70 border border-slate-700' : 'bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: user.avatar_color || '#10b981' }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200">
                        {user.name} {isMe && '(You)'}
                      </span>
                      {user.status === 'at_home' && (
                        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                          🏠 Away
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 capitalize">{user.role === 'admin' ? 'Admin' : 'Member'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold block ${
                    isOwedMoney
                      ? 'text-emerald-400'
                      : owesMoney
                        ? 'text-rose-400'
                        : 'text-slate-400'
                  }`}>
                    {isOwedMoney ? `+Rs. ${net}` : owesMoney ? `-Rs. ${Math.abs(net)}` : 'Rs. 0'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isOwedMoney ? 'Is owed' : owesMoney ? 'Owes' : 'Settled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. RECENT ACTIVITY SNIPPET */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Recent Meals</h3>
          </div>
          <button
            onClick={() => onNavigateTab('feed')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
          >
            All Meals <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentMeals.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No meals recorded yet in this cycle.</p>
        ) : (
          <div className="space-y-2">
            {recentMeals.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">
                      {meal.meal_type}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {meal.description || 'Meal Expense'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Paid by <strong className="text-slate-300">{meal.payer_name}</strong> • {meal.date}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white block">Rs. {meal.amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. RECENT ACTIVITY & AUDIT LOG - Never miss anything */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Recent Activity Log</h3>
          </div>
          <button
            onClick={() => onNavigateTab('logs')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 tap-active"
          >
            All Logs <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No activity logs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                onClick={() => onNavigateTab('logs')}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: log.user_avatar_color || '#10b981' }}
                >
                  {log.user_name ? log.user_name.charAt(0) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {log.title}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
