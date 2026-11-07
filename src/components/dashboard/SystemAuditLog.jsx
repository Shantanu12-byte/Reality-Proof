import React from 'react';
import { Activity, ShieldAlert, CheckCircle2, Lock, Cpu, Barcode, Inbox } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

export const SystemAuditLog = () => {
  const { activities: contextActivities } = useTaskContext();
  const eventsList = contextActivities || [];

  const getEventIcon = (type) => {
    const t = type || '';
    if (t.includes('PASS') || t.includes('SUCCESS') || t.includes('VERIFIED')) {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (t.includes('PAYPAL') || t.includes('AUTH') || t.includes('HOLD') || t.includes('PAYMENT')) {
      return <Lock className="w-3.5 h-3.5 text-[#6C5DD3]" />;
    }
    if (t.includes('HASH') || t.includes('DUPLICATE')) {
      return <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />;
    }
    if (t.includes('BREACH') || t.includes('GEOFENCE') || t.includes('FAILED')) {
      return <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />;
    }
    if (t.includes('BARCODE')) {
      return <Barcode className="w-3.5 h-3.5 text-slate-600" />;
    }
    return <Cpu className="w-3.5 h-3.5 text-[#6C5DD3]" />;
  };

  const getEventBg = (type) => {
    const t = type || '';
    if (t.includes('PASS') || t.includes('SUCCESS') || t.includes('VERIFIED')) {
      return 'bg-emerald-50';
    }
    if (t.includes('PAYPAL') || t.includes('AUTH') || t.includes('PAYMENT')) {
      return 'bg-purple-50';
    }
    if (t.includes('HASH') || t.includes('DUPLICATE')) {
      return 'bg-amber-50';
    }
    if (t.includes('BREACH') || t.includes('GEOFENCE')) {
      return 'bg-rose-50';
    }
    return 'bg-slate-100';
  };

  return (
    <div className="card-surface rounded-2xl p-5 sm:p-6 card-hover flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F9] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-reckless text-xl font-bold text-slate-900 tracking-tight">System Events</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time pipeline telemetry & gateway webhooks from MongoDB</p>
          </div>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System operational" />
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {eventsList.length === 0 ? (
          <div className="py-8 text-center bg-[#F8FAFC] rounded-xl border border-[#EEF2F6]">
            <Inbox className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <p className="text-xs text-slate-500">Awaiting live system events...</p>
          </div>
        ) : (
          eventsList.map((evt) => {
            const type = evt.type || evt.activityType || 'EVENT';
            const time = evt.formattedTime || (evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now');
            const detail = evt.detail || evt.description || '';
            return (
              <div
                key={evt.id || evt._id || Math.random()}
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] hover:bg-white hover:border-purple-200 transition-colors text-xs flex items-start gap-3"
              >
                <div className={`p-1.5 rounded-lg ${getEventBg(type)} mt-0.5 shrink-0`}>
                  {getEventIcon(type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 truncate">{evt.title || type}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {detail}
                  </p>
                  <div className="text-[9px] font-mono text-purple-600 font-semibold mt-1">
                    source: {evt.source || 'VisionInferenceEngine'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
