import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

let toastTimeout;
let externalSetToast = null;

export function showToast(message, type = 'success') {
  if (externalSetToast) {
    if (toastTimeout) clearTimeout(toastTimeout);
    externalSetToast({ message, type, visible: true });
    toastTimeout = setTimeout(() => {
      externalSetToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  }
}

export function ToastContainer() {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  useEffect(() => {
    externalSetToast = setToast;
    return () => {
      externalSetToast = null;
    };
  }, []);

  if (!toast.visible) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm transition-all duration-300 animate-fade-in">
      <div className={`flex items-center gap-3 p-3.5 rounded-xl shadow-glass border ${
        isSuccess 
          ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-glow-green' 
          : isError
            ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-glow-red'
            : 'bg-slate-900/90 text-slate-200 border-slate-700'
      }`}>
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
        <p className="text-sm font-medium flex-1">{toast.message}</p>
        <button 
          onClick={() => setToast(prev => ({ ...prev, visible: false }))}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
