import React from 'react';
import { Calendar, Plus, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { MetricCard } from '../components/common/MetricCard';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { OutcomesDonut } from '../components/dashboard/OutcomesDonut';
import { ExceptionsPanel } from '../components/dashboard/ExceptionsPanel';
import { RecentActivityTable } from '../components/dashboard/RecentActivityTable';
import { WorkerSummary } from '../components/dashboard/WorkerSummary';
import { PaymentOverview } from '../components/dashboard/PaymentOverview';
import { SystemAuditLog } from '../components/dashboard/SystemAuditLog';

export const OverviewPage = () => {
  const {
    dynamicKpis,
    selectedDateRange,
    setSelectedDateRange,
    setIsCreateModalOpen,
    addToast,
    loadBackendData
  } = useTaskContext();

  const [dateDropdownOpen, setDateDropdownOpen] = React.useState(false);
  const dateRanges = ['Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'Quarter to Date'];

  const handleRefresh = async () => {
    if (loadBackendData) {
      await loadBackendData(false);
    }
    addToast('Telemetry Synchronized', 'Fetched latest worker GPS pings, MongoDB records and status.', 'info');
  };

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EEF2F6]">
        <div>
          <h1 className="font-reckless text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Monitor verification activity, investigate exceptions and track operational performance.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-semibold transition-all shadow-2xs hover:shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-[#6C5DD3]" />
              <span>{selectedDateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {dateRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setSelectedDateRange(range);
                      setDateDropdownOpen(false);
                      addToast('Date Range Filtered', `Dashboard analytics updated to ${range}.`, 'info');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-left text-slate-700 hover:bg-purple-50 transition-colors font-medium"
                  >
                    <span>{range}</span>
                    {selectedDateRange === range && (
                      <Check className="w-3.5 h-3.5 text-[#6C5DD3]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Refresh */}
          <button
            onClick={handleRefresh}
            title="Refresh analytics telemetry"
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-[#6C5DD3] border border-[#E2E8F0] text-xs transition-all shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Create Task Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold tracking-tight shadow-md shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {dynamicKpis.map((metric, idx) => (
          <MetricCard key={metric.id} metric={metric} index={idx} />
        ))}
      </section>

      {/* Main Analytics Section: Chart A & Chart B */}
      <section aria-label="Verification Analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <ActivityChart />
        </div>
        <div className="lg:col-span-1 min-w-0">
          <OutcomesDonut />
        </div>
      </section>

      {/* Exceptions & Action Items: Requires Attention */}
      <section aria-label="Exceptions and Alerts">
        <ExceptionsPanel />
      </section>

      {/* Recent Activity Table */}
      <section aria-label="Recent Verification Activity">
        <RecentActivityTable limit={5} />
      </section>

      {/* Bottom Analytics Section: 3 Columns */}
      <section aria-label="System Performance and Financial Summary" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WorkerSummary />
        <PaymentOverview />
        <SystemAuditLog />
      </section>
    </div>
  );
};
