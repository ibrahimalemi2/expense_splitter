import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { X, UserCheck, AlertCircle } from 'lucide-react';

export function EditMemberModal({ member, isOpen, onClose, onSuccess }) {
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member && isOpen) {
      setName(member.name || '');
      setRole(member.role || 'member');
      setError('');
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateUser(member.id, {
        name: name.trim(),
        role
      }, currentUser);

      showToast(`Member updated to "${name.trim()}"!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-5 border border-slate-800 shadow-glass">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Edit Member Details</h3>
              <p className="text-[11px] text-slate-400">Update roommate name or role</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
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

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Member Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="member">Regular Member</option>
              <option value="admin">Mess Admin (Full Controls)</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
