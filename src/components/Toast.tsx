import React from 'react';
import { useAthletes } from '../context/AthleteContext';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAthletes();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isInfo = toast.type === 'info';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 animate-fadeIn",
              isSuccess && "bg-slate-950/95 border-lime-500/50 text-lime-300 shadow-glow-lime",
              isInfo && "bg-slate-950/95 border-cyan-500/50 text-cyan-300 shadow-glow-cyan",
              isWarning && "bg-slate-950/95 border-amber-500/50 text-amber-300",
              isError && "bg-slate-950/95 border-rose-500/50 text-rose-300"
            )}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0" />}
              {isInfo && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {isError && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              <span className="text-xs font-mono font-medium text-slate-200">{toast.message}</span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
