import React from 'react';
import { AlertTriangle, MapPin, Copy, FileWarning, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { getSeverityBadgeStyle } from '../../utils/formatters';

export const ExceptionsPanel = () => {
  const { tasks, setActiveTaskForDetail, exceptions: contextExceptions } = useTaskContext();
  const activeExceptions = contextExceptions || [];

  const handleReview = (taskId) => {
    const target = tasks.find((t) => t.id === taskId || t.taskId === taskId);
    if (target) {
      setActiveTaskForDetail(target);
    }
  };

  const getExceptionIcon = (title) => {
    const t = title || '';
    if (t.includes('Duplicate')) {
      return <Copy className="w-4 h-4 text-amber-600" />;
    }
    if (t.includes('Location') || t.includes('Perimeter') || t.includes('GPS')) {
      return <MapPin className="w-4 h-4 text-rose-600" />;
    }
    return <FileWarning className="w-4 h-4 text-[#6C5DD3]" />;
  };

  const getIconContainerBg = (title) => {
    const t = title || '';
    if (t.includes('Duplicate')) {
      return 'bg-amber-50';
    }
    if (t.includes('Location') || t.includes('Perimeter') || t.includes('GPS')) {
      return 'bg-rose-50';
    }
    return 'bg-purple-50';
  };

  return (
    <div className="card-surface rounded-2xl p-5 sm:p-6 card-hover flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F1F4F9] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-reckless text-xl font-bold text-slate-900 tracking-tight">Requires Attention</h3>
            <p className="text-xs text-slate-500 font-medium">Exceptions flagged by AI pipeline pending operational review</p>
          </div>
        </div>
        <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
          {activeExceptions.length} Action Items
        </span>
      </div>

      {/* Exception items */}
      <div className="space-y-3">
        {activeExceptions.length === 0 ? (
          <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#EEF2F6]">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-xs font-bold text-slate-800">Zero Pending Exceptions</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All physical task submissions have passed verification gates without anomalies.</p>
          </div>
        ) : (
          activeExceptions.map((item) => (
            <div
              key={item.id || item._id || item.taskId}
              className="p-4 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] hover:bg-white hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className={`p-2.5 rounded-xl ${getIconContainerBg(item.title)} shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                  {getExceptionIcon(item.title)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">
                      {item.title}
                    </span>
                    <span className="text-xs font-mono text-[#6C5DD3] font-bold">
                      — {item.taskId}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border font-bold ${getSeverityBadgeStyle(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-mono">
                    <span>Inspector: <strong className="text-slate-700 font-sans">{item.worker}</strong></span>
                    <span>•</span>
                    <span>Zone: {item.location}</span>
                    <span>•</span>
                    <span>Time: {item.time}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleReview(item.taskId)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#6C5DD3] text-slate-700 hover:text-white border border-[#E2E8F0] hover:border-[#6C5DD3] text-xs font-bold transition-all duration-200 shadow-2xs hover:shadow-sm"
                >
                  <span>Review</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6C5DD3] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
