import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTaskContext } from '../../context/TaskContext';
import { ChartCard } from '../common/ChartCard';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, item) => sum + (item.value || 0), 0);
    return (
      <div className="bg-white border border-[#E2E8F0] p-3 rounded-2xl shadow-xl text-xs font-sans min-w-[170px]">
        <div className="font-bold text-slate-900 mb-2 pb-1.5 border-b border-[#F1F4F9] flex justify-between">
          <span>{label}</span>
          <span className="text-slate-400 font-mono">Total: {total}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const ActivityChart = () => {
  const { tasks } = useTaskContext();
  const [range, setRange] = useState('14d');

  // Dynamically bucket tasks by day based on live MongoDB records
  const chartData = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 14;
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      const dayNum = String(d.getDate()).padStart(2, '0');
      const label = `${monthShort} ${dayNum}`;

      const dayTasks = tasks.filter((t) => {
        const taskDate = t.date || (t.createdAt ? t.createdAt.split('T')[0] : '');
        return taskDate === dateStr;
      });

      const verified = dayTasks.filter(
        (t) => (t.verificationStatus || t.aiResult) === 'Verified'
      ).length;
      const pending = dayTasks.filter(
        (t) =>
          (t.verificationStatus || t.aiResult) === 'Pending' ||
          (t.verificationStatus || t.aiResult) === 'Review Required'
      ).length;
      const failed = dayTasks.filter(
        (t) => (t.verificationStatus || t.aiResult) === 'Failed'
      ).length;

      result.push({
        date: label,
        verified,
        pending,
        failed,
      });
    }

    return result;
  }, [tasks, range]);

  const rangeButtons = (
    <div className="flex items-center bg-[#F6F8FC] rounded-full p-1 border border-[#EEF2F6]">
      {['7d', '14d', '30d'].map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
            range === r
              ? 'bg-[#6C5DD3] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {r.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard
      title="Verification Activity"
      subtitle="Daily throughput and AI exception triage volume"
      badge="Daily Inferences"
      action={rangeButtons}
    >
      <div className="min-h-[280px] h-[300px] w-full pt-2 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="verifiedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6C5DD3" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6C5DD3" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B8B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B8B" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#F1F4F9" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#94A3B8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={{ stroke: '#F1F4F9' }}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}
            />

            <Area
              type="monotone"
              dataKey="verified"
              name="Verified tasks"
              stroke="#10B981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#verifiedGrad)"
            />
            <Area
              type="monotone"
              dataKey="pending"
              name="Pending reviews"
              stroke="#6C5DD3"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#pendingGrad)"
            />
            <Area
              type="monotone"
              dataKey="failed"
              name="Failed tasks"
              stroke="#FF6B8B"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#failedGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};
