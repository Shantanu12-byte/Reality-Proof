import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

export const ToastContainer = () => {
  const { toasts, removeToast } = useTaskContext();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          danger: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
          info: <Info className="w-5 h-5 text-[#6C5DD3] shrink-0" />
        };

        const borderStyles = {
          success: 'border-emerald-200 bg-white text-emerald-900',
          warning: 'border-amber-200 bg-white text-amber-900',
          danger: 'border-rose-200 bg-white text-rose-900',
          info: 'border-purple-200 bg-white text-slate-900'
        }[toast.type] || 'border-[#E2E8F0] bg-white text-slate-900';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${borderStyles}`}
          >
            <div className="mt-0.5">{icons[toast.type] || icons.info}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 tracking-tight">{toast.title}</div>
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
