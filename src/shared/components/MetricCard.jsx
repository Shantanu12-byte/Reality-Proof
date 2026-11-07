import React from 'react';
import { TrendingUp, TrendingDown, Clock, ShieldAlert, DollarSign, Layers, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

export const MetricCard = ({ metric, index }) => {
  const { id, label, value, change, isPositive, comparison, secondaryNote } = metric;

  // Primary KPI card is the Stitch Titanium Sapphire executive card
  const isPrimary = id === 'total_tasks';

  const getCardIcon = () => {
    switch (id) {
      case 'total_tasks':
        return <Layers className="w-5 h-5 text-blue-300" />;
      case 'verified':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'under_review':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'flagged':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'payment_pending':
        return <DollarSign className="w-5 h-5 text-blue-600" />;
      default:
        return <Layers className="w-5 h-5 text-slate-600" />;
    }
  };

  const getIconBg = () => {
    switch (id) {
      case 'total_tasks':
        return 'bg-white/10 text-white border border-white/20';
      case 'verified':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200/80';
      case 'under_review':
        return 'bg-amber-50 text-amber-600 border border-amber-200/80';
      case 'flagged':
        return 'bg-rose-50 text-rose-600 border border-rose-200/80';
      case 'payment_pending':
        return 'bg-blue-50 text-blue-600 border border-blue-200/80';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  if (isPrimary) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e40af] p-5 text-white shadow-[0_12px_30px_-6px_rgba(15,23,42,0.3)] border border-slate-700/60 flex flex-col justify-between min-h-[168px] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_22px_40px_-8px_rgba(30,64,175,0.45)] hover:border-blue-400/60 group cursor-default">
        {/* Decorative blur sphere */}
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out" />
        
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-blue-200/90 font-bold">
              {label}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-300 shadow-inner group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
              {getCardIcon()}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-sans group-hover:tracking-normal transition-all duration-300">
              {value}
            </span>
            {change && (
              <span className="inline-flex items-center gap-0.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 font-mono text-[11px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                <ArrowUpRight className="w-3 h-3" />
                {change}
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/15 flex items-center justify-between font-mono text-[11px] text-blue-200/75">
          <span className="truncate">{comparison || 'Live Network Dispatches'}</span>
          <span className="text-blue-100 font-semibold">{secondaryNote || '100% Attested'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between min-h-[168px] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-6px_rgba(15,23,42,0.12)] hover:border-blue-500/50 group cursor-default">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            {label}
          </span>
          <div className={`w-8 h-8 rounded-xl ${getIconBg()} flex items-center justify-center shadow-2xs group-hover:scale-110 transition-all duration-300`}>
            {getCardIcon()}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans group-hover:text-blue-950 transition-colors">
            {value}
          </span>
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full font-mono text-[11px] border shadow-2xs ${
                isPositive === true
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isPositive === false
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isPositive === true && <ArrowUpRight className="w-3 h-3" />}
              {isPositive === false && <ArrowDownRight className="w-3 h-3" />}
              {change}
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
        <span className="text-slate-500 truncate font-medium">
          {comparison}
        </span>
        {secondaryNote && (
          <span className="text-slate-700 font-semibold hidden sm:inline-block">
            {secondaryNote}
          </span>
        )}
      </div>
    </div>
  );
};
