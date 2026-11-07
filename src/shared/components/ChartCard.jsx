import React from 'react';

export const ChartCard = ({ title, subtitle, badge, action, children, className = '' }) => {
  return (
    <div className={`card-surface rounded-2xl p-5 sm:p-6 card-hover flex flex-col justify-between ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F1F4F9]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-reckless text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
            {badge && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6C5DD3] border border-purple-100">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {action}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};
