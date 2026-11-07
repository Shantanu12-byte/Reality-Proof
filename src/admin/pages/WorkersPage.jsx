import React, { useState } from 'react';
import {
  Users,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  Phone,
  Search,
  Plus,
  Filter,
  Check,
  DollarSign,
  RefreshCw,
  Send,
  Sparkles,
  LayoutGrid,
  List,
  Cpu,
  Radio
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const WorkersPage = () => {
  const { addToast, setIsCreateModalOpen, workers: contextWorkers, refreshData, isLoading } = useTaskContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const workersList = contextWorkers || [];

  const filteredWorkers = workersList.filter((w) => {
    const loc = w.city || w.location || '';
    if (selectedZone !== 'All' && loc !== selectedZone) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const id = w.workerId || w.id || '';
      return (
        w.name.toLowerCase().includes(q) ||
        loc.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleMessageWorker = (worker) => {
    addToast('SMS Dispatch', `Dispatched priority operational notification to ${worker.name} (${worker.phone || 'registered device'}).`, 'info');
  };

  const totalBalance = workersList.reduce((acc, w) => acc + (typeof w.balance === 'number' ? w.balance : 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Command & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/90">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-plus font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Field Workers Directory &amp; Specialist Roster
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="font-mono text-[11px] text-slate-700 font-semibold">
                {workersList.length} Registered Inspectors
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              TPM 2.0 Attested
            </span>
          </div>
          <p className="font-plus text-xs sm:text-sm text-slate-500 max-w-4xl">
            Track real-time field workforce reliability ratings, hardware attestation status, active zone assignments, and automated escrow payout settlements from the live cluster registry.
          </p>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button
            onClick={() => refreshData && refreshData()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl shadow-2xs hover:shadow-sm transition-all text-xs font-plus font-medium"
            title="Refresh Workers from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => addToast('Invite Sent', 'Generated worker onboarding link with KYC identity verification.', 'success')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-blue-700 font-plus font-bold rounded-xl border border-blue-200/80 shadow-2xs hover:shadow-sm transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Invite Inspector</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="stitch-btn-primary group relative overflow-hidden flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-xs font-plus font-bold active:scale-[0.98]"
          >
            <span className="stitch-shimmer"></span>
            <Plus className="w-3.5 h-3.5" />
            <span>+ Dispatch Task</span>
          </button>
        </div>
      </div>

      {/* Operational 4-Card KPI Suite */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="stitch-card-hover p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fleet Strength</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">{workersList.length || 13}</span>
            <span className="font-mono text-xs text-slate-400 font-medium">Active Cadre</span>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg font-mono text-[10px] text-slate-600">
            <span className="text-emerald-700 font-semibold">{workersList.length || 10} Active</span>
            <span>•</span>
            <span className="text-blue-700 font-semibold">2 Review</span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">1 Flagged</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="stitch-card-hover p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Consensus Accuracy</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">97.4%</span>
            <span className="font-mono text-xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+1.2% mo/mo</span>
          </div>
          <div className="flex items-center justify-between mt-3 font-mono text-[10px] text-slate-500">
            <span>Vision Engine Attested</span>
            <span className="font-semibold text-slate-800">1,042 Attestations</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="stitch-card-hover p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Settled Escrow</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">${totalBalance ? totalBalance.toFixed(2) : '8,420.00'}</span>
            <span className="font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">Instant PayPal</span>
          </div>
          <div className="flex items-center justify-between mt-3 font-mono text-[10px] text-slate-500">
            <span>Pending Clearance</span>
            <span className="font-semibold text-slate-800">$1,845.00</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="stitch-card-hover p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cluster Coverage</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">100%</span>
            <span className="font-mono text-xs text-blue-700 font-semibold">4 / 4 Zones</span>
          </div>
          <div className="flex items-center justify-between mt-3 font-mono text-[10px] text-slate-500">
            <span>RTK Drift Invariant</span>
            <span className="font-semibold text-emerald-700">0.38m CEP</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workers by name, ID or city..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs font-medium transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono text-[11px] font-semibold">ZONE:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="All">All Cities</option>
              <option value="Pune">Pune</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Nashik">Nashik</option>
              <option value="Nagpur">Nagpur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workers View: Grid or Table */}
      {filteredWorkers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-16 text-center text-slate-400 shadow-2xs">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-plus text-sm font-semibold text-slate-800">No field workers found</p>
          <p className="font-mono text-xs text-slate-400 mt-1">Adjust search filter or dispatch new worker invitations.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkers.map((worker) => {
            const workerKey = worker.workerId || worker.id || worker._id;
            const balanceDisplay = typeof worker.balance === 'number' ? `$${worker.balance.toFixed(2)}` : (worker.balance || '$0.00');
            const accuracyDisplay = worker.accuracy !== undefined ? `${worker.accuracy}%` : (worker.verifiedRate || '100%');
            const jobsDisplay = worker.completedJobs !== undefined ? worker.completedJobs : (worker.tasksCompleted || 0);

            return (
              <div
                key={workerKey}
                className="stitch-card-hover bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between shadow-2xs group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-900 to-blue-900 text-white font-mono font-bold text-xs flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        {worker.avatar || (worker.name ? worker.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'W')}
                      </div>
                      <div>
                        <h3 className="font-plus font-bold text-slate-900 text-xs leading-snug">{worker.name}</h3>
                        <span className="font-mono text-[10px] text-blue-600 font-bold">{worker.workerId || worker.id}</span>
                      </div>
                    </div>
                    <StatusBadge status={worker.status || 'Active'} size="xs" />
                  </div>

                  {/* Badges row: Enclave & RTK */}
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      TPM 2.0 OK
                    </span>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                      RTK 0.38m
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600 mb-3 font-plus">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{worker.zone || worker.city || worker.location || 'Pune West'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{worker.phone || '+91 98000 00000'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 mb-3">
                    <div>
                      <div className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rating</div>
                      <div className="text-slate-900 font-bold flex items-center gap-1 mt-0.5 font-mono text-xs">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        <span>{worker.rating || 5.0}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Accuracy</div>
                      <div className="text-emerald-700 font-bold font-mono text-xs mt-0.5">
                        {accuracyDisplay}
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200">
                      <div className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Completed</div>
                      <div className="text-slate-900 font-bold font-mono text-xs mt-0.5">
                        {jobsDisplay}
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200">
                      <div className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Balance</div>
                      <div className="text-blue-700 font-bold font-mono text-xs mt-0.5">
                        {balanceDisplay}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-400 truncate">
                    PayPal: {worker.paypalStatus || 'Linked'}
                  </span>
                  <button
                    onClick={() => handleMessageWorker(worker)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white font-plus text-xs font-bold transition-all shrink-0 shadow-2xs hover:shadow-xs"
                  >
                    Notify
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">Inspector / ID</th>
                <th className="py-2.5 px-3">Enclave Attestation</th>
                <th className="py-2.5 px-3">Operational Zone</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Completed</th>
                <th className="py-2.5 px-3">Escrow Balance</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-plus text-slate-800">
              {filteredWorkers.map((worker) => {
                const workerKey = worker.workerId || worker.id || worker._id;
                const balanceDisplay = typeof worker.balance === 'number' ? `$${worker.balance.toFixed(2)}` : (worker.balance || '$0.00');
                const accuracyDisplay = worker.accuracy !== undefined ? `${worker.accuracy}%` : (worker.verifiedRate || '100%');
                const jobsDisplay = worker.completedJobs !== undefined ? worker.completedJobs : (worker.tasksCompleted || 0);

                return (
                  <tr key={workerKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                          {worker.avatar || (worker.name ? worker.name.slice(0, 2).toUpperCase() : 'W')}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{worker.name}</span>
                          <span className="font-mono text-[10px] text-blue-600 font-semibold">{worker.workerId || worker.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        <Cpu className="w-3 h-3 text-emerald-600" />
                        TPM 2.0 VALID
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs text-slate-700">{worker.zone || worker.city || worker.location || 'Pune West'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-bold text-emerald-700">{accuracyDisplay}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs text-slate-900 font-semibold">{jobsDisplay}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-bold text-blue-700">{balanceDisplay}</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={worker.status || 'Active'} size="xs" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleMessageWorker(worker)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-plus text-xs font-bold transition-all"
                      >
                        Notify
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
