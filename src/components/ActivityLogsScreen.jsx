import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { 
  ScrollText, 
  Utensils, 
  ChefHat, 
  RefreshCw, 
  Users, 
  KeyRound, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Logs', icon: ScrollText },
  { id: 'meal', label: 'Meals & Food', icon: Utensils },
  { id: 'duty', label: 'Cooking Duty', icon: ChefHat },
  { id: 'cycle', label: 'Cycles', icon: RefreshCw },
  { id: 'member', label: 'Members', icon: Users },
  { id: 'security', label: 'Security & PIN', icon: KeyRound },
];

function getCategoryTheme(category) {
  switch (category) {
    case 'meal':
      return {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        icon: Utensils,
      };
    case 'duty':
      return {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        icon: ChefHat,
      };
    case 'cycle':
      return {
        bg: 'bg-purple-500/15',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        dot: 'bg-purple-400',
        icon: RefreshCw,
      };
    case 'member':
      return {
        bg: 'bg-sky-500/15',
        border: 'border-sky-500/30',
        text: 'text-sky-400',
        dot: 'bg-sky-400',
        icon: Users,
      };
    case 'security':
      return {
        bg: 'bg-rose-500/15',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        dot: 'bg-rose-400',
        icon: KeyRound,
      };
    default:
      return {
        bg: 'bg-slate-800',
        border: 'border-slate-700',
        text: 'text-slate-300',
        dot: 'bg-slate-400',
        icon: ScrollText,
      };
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recent';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function ActivityLogsScreen({ onRefreshOverall }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await api.getLogs({ limit: 150 });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    await onRefreshOverall?.();
  };

  // Filter logs by category and search term
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.description?.toLowerCase().includes(q) ||
        log.title?.toLowerCase().includes(q) ||
        log.user_name?.toLowerCase().includes(q) ||
        log.action_type?.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [logs, selectedCategory, searchQuery]);

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Activity & Audit Logs
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {filteredLogs.length} events
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete history so roommates never miss any expense or rotation change
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 text-xs font-semibold transition-all tap-active disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search logs by roommate name, meal, amount or action..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded-md"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active shrink-0 ${
                isSelected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500 shadow-glow-green'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Logs Timeline List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin text-emerald-400 mb-2" />
          <p className="text-xs">Loading activity timeline...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 border border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <ScrollText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No activity logs found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No logs match "${searchQuery}". Try clearing search filters.`
              : 'Every new meal expense, cooking duty rotation, and status change will appear here in real time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            const theme = getCategoryTheme(log.category);
            const CategoryIcon = theme.icon;

            return (
              <div
                key={log.id}
                className="glass-card rounded-2xl p-3.5 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start gap-3 relative overflow-hidden group"
              >
                {/* User Avatar Initial */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm mt-0.5"
                  style={{ backgroundColor: log.user_avatar_color || '#10b981' }}
                >
                  {log.user_name ? log.user_name.charAt(0) : '?'}
                </div>

                {/* Log Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-white truncate">
                        {log.user_name}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.bg} ${theme.border} ${theme.text}`}>
                        <CategoryIcon className="w-2.5 h-2.5" />
                        <span>{log.title}</span>
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0 font-medium">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatRelativeTime(log.created_at)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-snug break-words">
                    {log.description}
                  </p>

                  {/* Metadata Tags if available */}
                  {log.metadata && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {log.metadata.amount && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Rs. {log.metadata.amount}
                        </span>
                      )}
                      {log.metadata.meal_type && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                          {log.metadata.meal_type}
                        </span>
                      )}
                      {log.metadata.attendeeCount && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                          {log.metadata.attendeeCount} Ate
                        </span>
                      )}
                      {log.metadata.previousCook && log.metadata.nextCook && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <span>{log.metadata.previousCook}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                          <span>{log.metadata.nextCook}</span>
                        </span>
                      )}
                      {log.metadata.carryForward !== undefined && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {log.metadata.carryForward ? 'Carry-forward On' : 'Cash Cleared'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
