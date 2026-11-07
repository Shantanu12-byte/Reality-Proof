import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from '../common/ChartCard';

import { useTaskContext } from '../../context/TaskContext';

const CustomDonutTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[#E2E8F0] p-3 rounded-2xl shadow-xl text-xs font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-bold text-slate-800">{data.name}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2 font-mono">
          <span className="text-base font-bold text-slate-900">{data.value}%</span>
          <span className="text-slate-500 text-[11px]">({data.count} tasks)</span>
        </div>
      </div>
    );
  }
  return null;
};

export const OutcomesDonut = () => {
  const { dynamicOutcomes } = useTaskContext();
  const outcomesData = dynamicOutcomes || [];
  const verifiedItem = outcomesData.find((o) => o.name === 'Verified') || { value: 0 };
  const centerPercent = verifiedItem.value;

  return (
    <ChartCard
      title="Verification Outcomes"
      subtitle="Multi-modal decision distribution across pipeline"
      badge="Result Breakdown"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[280px] h-auto sm:h-[300px] min-w-0 w-full">
        {/* Donut Chart with Center Stat */}
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomDonutTooltip />} />
              <Pie
                data={outcomesData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={84}
                paddingAngle={4}
                dataKey="value"
                stroke="#FFFFFF"
                strokeWidth={3}
              >
                {outcomesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Stat in Reckless Serif font */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="font-reckless text-3xl font-bold text-slate-900 tracking-tight">{centerPercent}%</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans">
              Auto-Verified
            </span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="flex-1 w-full space-y-2 sm:pl-4 sm:border-l sm:border-[#F1F4F9]">
          {outcomesData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] hover:bg-purple-50/50 hover:border-purple-200 transition-all duration-200 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-800 font-semibold">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400 text-[11px]">{item.count}</span>
                <span className="text-slate-900 font-bold w-10 text-right">{item.value}%</span>
              </div>
            </div>
          ))}

          <div className="pt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between border-t border-[#F1F4F9]">
            <span>Threshold: &gt;90% confidence</span>
            <span className="text-[#6C5DD3] font-bold font-mono">SLA: 99.8%</span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};
