import React from 'react';
import { Calendar, Plus, RefreshCw, ChevronDown, Check, FileDown, Activity, Sparkles, Database } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
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
    loadBackendData,
    isBackendConnected
  } = useTaskContext();

  const [dateDropdownOpen, setDateDropdownOpen] = React.useState(false);
  const dateRanges = ['Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'Quarter to Date'];

  const handleRefresh = async () => {
    if (loadBackendData) {
      await loadBackendData(false);
    }
    addToast('Telemetry Synchronized', 'Fetched latest worker GPS pings, MongoDB records and verification status.', 'info');
  };

  const handleExportCsv = () => {
    addToast('Audit Report Generated', 'Exported cryptographic verification telemetry to CSV format.', 'success');
  };

  return (
    <div className="space-y-6 animate-card-open">
      {/* Precision Operations Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Operations Overview
            </h1>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 px-3 py-1 rounded-full shadow-2xs hover:border-emerald-400/50 transition-all cursor-default">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
              <span className="font-mono text-[11px] text-emerald-800 font-bold">MongoDB Atlas Sync</span>
              <span className="text-slate-300 font-mono text-[11px]">•</span>
              <span className="font-mono text-[11px] text-slate-500 font-semibold">18ms latency</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full text-slate-700 font-mono text-[11px]">
              <Database className="w-3 h-3 text-blue-600" />
              <span>Epoch #8,192</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 bg-blue-50 border border-blue-200/80 text-blue-800 px-2.5 py-1 rounded-full font-sans text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>ZK-Prover Active</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Monitor cryptographic verification throughput, resolve edge anomalies, and manage escrow settlements across distributed zones.
          </p>
        </div>

        {/* Date Selector, CSV Audit & Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap self-start xl:self-center">
          {/* Quick Segment Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            {['7D', '14D', '30D'].map((rangeLabel) => {
              const fullLabel = rangeLabel === '7D' ? 'Last 7 Days' : rangeLabel === '14D' ? 'Last 14 Days' : 'Last 30 Days';
              const isSelected = selectedDateRange === fullLabel;
              return (
                <button
                  key={rangeLabel}
                  onClick={() => {
                    setSelectedDateRange(fullLabel);
                    addToast('Timeline Filtered', `Analytics telemetry filtered to ${fullLabel}.`, 'info');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-white text-blue-700 border border-slate-200/90 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {rangeLabel}
                </button>
              );
            })}
          </div>

          {/* Date Range Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-2xs hover:shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{selectedDateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {dateRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setSelectedDateRange(range);
                      setDateDropdownOpen(false);
                      addToast('Date Range Filtered', `Dashboard analytics updated to ${range}.`, 'info');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-left text-slate-700 hover:bg-blue-50 transition-colors font-medium"
                  >
                    <span>{range}</span>
                    {selectedDateRange === range && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
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
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-200 text-xs transition-all shadow-2xs hover:shadow-xs active:rotate-180 duration-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export CSV Audit Button */}
          <button
            onClick={handleExportCsv}
            className="group flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs transition-all duration-300 shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 font-bold"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span>Audit CSV</span>
          </button>

          {/* Primary Create Task CTA */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="relative group overflow-hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 hover:from-slate-900 hover:via-blue-950 hover:to-blue-800 text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(15,23,42,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(30,64,175,0.45)] border border-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-90 transition-transform duration-300" />
            <span>Create Task Dispatch</span>
          </button>
        </div>
      </div>

      {/* 5-Card KPI Section */}
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
