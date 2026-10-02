import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, KeyRound, Home, ArrowLeft, Delete, Sparkles, UtensilsCrossed } from 'lucide-react';
import { showToast } from './Toast';

export function LoginScreen() {
  const { users, login } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
    setError('');
  };

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        submitLogin(selectedUser.id, nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const submitLogin = async (userId, enteredPin) => {
    setIsSubmitting(true);
    setError('');
    try {
      await login(userId, enteredPin);
      showToast(`Welcome back, ${selectedUser.name}!`);
    } catch (err) {
      setError(err.message || 'Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Demo Auto-fill Helper
  const handleQuickDemo = (user, demoPin) => {
    setSelectedUser(user);
    setPin(demoPin);
    submitLogin(user.id, demoPin);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-glow-green text-white mb-3">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hostel Mess Splitter</h1>
          <p className="text-sm text-slate-400 mt-1">Smart Meal Splits, Daily Balances & Cycles</p>
        </div>

        {/* Step 1: Select Profile */}
        {!selectedUser ? (
          <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-glass animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Who are you?</h2>
                <p className="text-xs text-slate-400">Select your profile to continue with your 4-digit PIN</p>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {users.length} Roommates
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {users.map((user) => {
                const isAdmin = user.role === 'admin';
                const isAtHome = user.status === 'at_home';

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 transition-all text-left group tap-active"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                        style={{ backgroundColor: user.avatar_color || '#10b981' }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-200 group-hover:text-white">
                            {user.name}
                          </span>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 capitalize">{user.role === 'admin' ? 'Mess Admin' : 'Roommate'}</span>
                      </div>
                    </div>

                    <div>
                      {isAtHome ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Home className="w-3 h-3" /> At Home
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          Sign In &rarr;
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Demo Login Shortcuts */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Instant Demo Shortcuts:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const admin = users.find(u => u.role === 'admin') || users[0];
                    if (admin) handleQuickDemo(admin, '1234');
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-emerald-950/40 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs transition-colors flex items-center justify-between"
                >
                  <span className="truncate font-medium">👑 Ali (Admin)</span>
                  <span className="text-[10px] text-slate-400 font-mono">PIN: 1234</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const member = users.find(u => u.role === 'member') || users[1];
                    if (member) handleQuickDemo(member, '2345');
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 text-xs transition-colors flex items-center justify-between"
                >
                  <span className="truncate font-medium">👤 Bilal (Member)</span>
                  <span className="text-[10px] text-slate-400 font-mono">PIN: 2345</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: 4-Digit PIN Pad */
          <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-glass animate-fade-in">
            <button
              onClick={() => {
                setSelectedUser(null);
                setPin('');
                setError('');
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change User
            </button>

            <div className="flex flex-col items-center mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-md mb-2"
                style={{ backgroundColor: selectedUser.avatar_color || '#10b981' }}
              >
                {selectedUser.name.charAt(0)}
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                {selectedUser.name}
                {selectedUser.role === 'admin' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Admin
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Enter your 4-digit PIN</p>

              {/* 4 Dots PIN Display */}
              <div className="flex gap-3 my-5">
                {[0, 1, 2, 3].map((index) => {
                  const filled = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        filled
                          ? 'bg-emerald-400 scale-125 shadow-glow-green'
                          : 'bg-slate-750 border border-slate-600'
                      }`}
                    />
                  );
                })}
              </div>

              {error && (
                <div className="text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-500/30 px-3 py-1.5 rounded-lg mb-2 text-center animate-shake">
                  {error}
                </div>
              )}
            </div>

            {/* Virtual Numpad for Mobile and Desktop */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(String(num))}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-lg font-bold text-white transition-all tap-active flex items-center justify-center active:scale-95"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center justify-center"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-lg font-bold text-white transition-all tap-active flex items-center justify-center active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Hint for PIN */}
            <div className="mt-4 text-center">
              <span className="text-[11px] text-slate-400">
                Hint: Default PIN is <code className="text-emerald-400 font-mono">{selectedUser.pin || (selectedUser.role === 'admin' ? '1234' : '2345')}</code>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
