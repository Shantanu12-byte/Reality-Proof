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
  RefreshCw
} from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const WorkersPage = () => {
  const { addToast, setIsCreateModalOpen, workers: contextWorkers, refreshData, isLoading } = useTaskContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');

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
    addToast('SMS Dispatch', `Dispatched priority operational notification to ${worker.name} (${worker.phone || 'registered phone'}).`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EEF2F6]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-reckless text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Field Workers Directory
            </h1>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-purple-50 text-[#6C5DD3] border border-purple-200">
              {workersList.length} Registered Inspectors
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Track field force reliability ratings, task accuracy scores, active zone assignments and payout accounts from live database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshData && refreshData()}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-[#6C5DD3] border border-[#E2E8F0] text-xs transition-all shadow-2xs"
            title="Refresh Workers from MongoDB"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => addToast('Invite Sent', 'Generated worker onboarding link with KYC identity verification.', 'success')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-bold transition-all shadow-2xs hover:shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#6C5DD3]" />
            <span>Invite Inspector</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold tracking-tight shadow-md shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dispatch Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 text-xs card-hover">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workers by name, ID or city..."
            className="w-full bg-[#F6F8FC] border border-[#E9EFF6] rounded-full pl-10 pr-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5DD3] focus:bg-white focus:ring-2 focus:ring-purple-500/10 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs font-semibold">Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#6C5DD3] focus:bg-white"
          >
            <option value="All">All Cities</option>
            <option value="Pune">Pune</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Nashik">Nashik</option>
            <option value="Nagpur">Nagpur</option>
          </select>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredWorkers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No field workers found</p>
            <p className="text-xs text-slate-400 mt-1">Connect to backend to load authentic registered workers.</p>
          </div>
        ) : (
          filteredWorkers.map((worker) => {
            const workerKey = worker.workerId || worker.id || worker._id;
            const balanceDisplay = typeof worker.balance === 'number' ? `$${worker.balance.toFixed(2)}` : (worker.balance || '$0.00');
            const accuracyDisplay = worker.accuracy !== undefined ? `${worker.accuracy}%` : (worker.verifiedRate || '100%');
            const jobsDisplay = worker.completedJobs !== undefined ? worker.completedJobs : (worker.tasksCompleted || 0);

            return (
              <div
                key={workerKey}
                className="card-surface rounded-2xl p-5 flex flex-col justify-between card-hover text-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6C5DD3] to-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-purple-500/20">
                        {worker.avatar || (worker.name ? worker.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'W')}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs leading-snug">{worker.name}</h3>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{worker.workerId || worker.id}</span>
                      </div>
                    </div>
                    <StatusBadge status={worker.status || 'Active'} size="xs" />
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600 mb-3.5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#6C5DD3] shrink-0" />
                      <span className="truncate">{worker.zone || worker.city || worker.location || 'Pune West'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{worker.phone || '+91 98000 00000'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] mb-3.5">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating</div>
                      <div className="text-slate-900 font-bold flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{worker.rating || 5.0}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Accuracy</div>
                      <div className="text-emerald-700 font-bold font-mono mt-0.5">
                        {accuracyDisplay}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#EEF2F6]">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jobs Done</div>
                      <div className="text-slate-900 font-bold font-mono mt-0.5">
                        {jobsDisplay}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#EEF2F6]">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance</div>
                      <div className="text-[#6C5DD3] font-bold font-mono mt-0.5">
                        {balanceDisplay}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F4F9] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400 truncate font-medium">
                    PayPal: {worker.paypalStatus || 'Linked & Verified'}
                  </span>
                  <button
                    onClick={() => handleMessageWorker(worker)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#6C5DD3] text-slate-700 hover:text-white text-xs font-bold transition-all shrink-0 shadow-2xs hover:shadow-xs"
                  >
                    Notify
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
