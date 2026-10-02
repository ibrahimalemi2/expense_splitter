import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { X, KeyRound, Lock, AlertCircle, Check } from 'lucide-react';

export function ChangePinModal({ targetUser, isOpen, onClose, onSuccess }) {
  const { currentUser, isAdmin } = useAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !targetUser) return null;

  const isSelf = currentUser && currentUser.id === targetUser.id;
  const requireCurrentPin = isSelf && !isAdmin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (requireCurrentPin && currentPin.length !== 4) {
      setError('Please enter your current 4-digit PIN.');
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.changePin(targetUser.id, currentPin, newPin, currentUser);
      showToast(
        isSelf 
          ? 'Your PIN has been updated successfully!' 
          : `PIN for ${targetUser.name} updated by admin!`
      );
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update PIN. Check current PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-5 border border-slate-800 shadow-glass">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isSelf ? 'Change Your PIN' : `Change PIN for ${targetUser.name}`}
              </h3>
              <p className="text-[11px] text-slate-400">4-digit numeric login PIN</p>
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
          {requireCurrentPin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-base text-white text-center font-mono tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New 4-Digit PIN
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-base text-white text-center font-mono tracking-widest focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Confirm New PIN
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-base text-white text-center font-mono tracking-widest focus:outline-none focus:border-emerald-500"
            />
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
              disabled={isSubmitting || newPin.length !== 4 || confirmPin.length !== 4}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
