import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Eye,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  FileDown,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeleteTaskModal } from '@/shared/components/DeleteTaskModal';

export const TasksPage = () => {
  const {
    tasks,
    setIsCreateModalOpen,
    setActiveTaskForDetail,
    deleteTask,
    searchQuery: globalSearchQuery,
    addToast
  } = useTaskContext();

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [localSearch, setLocalSearch] = useState(globalSearchQuery || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Category counts for Stitch segment pills
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      review: tasks.filter(t => t.status === 'Under Review' || t.verificationStatus === 'Review Required').length,
      flagged: tasks.filter(t => (t.aiResult || t.verificationStatus) === 'Failed' && t.status !== 'Rejected').length,
      settled: tasks.filter(t => t.paymentStatus === 'Settled' || t.paymentStatus === 'Released' || t.status === 'Completed').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const search = localSearch.toLowerCase().trim();
      if (search) {
        const matchesId = (task.taskId || task.id || '').toLowerCase().includes(search);
        const matchesName = (task.title || task.name || '').toLowerCase().includes(search);
        const workerName = task.worker?.name || task.assignedWorker?.name || '';
        const matchesWorker = workerName.toLowerCase().includes(search);
        const matchesLocation = (task.location || '').toLowerCase().includes(search);
        if (!matchesId && !matchesName && !matchesWorker && !matchesLocation) {
          return false;
        }
      }

      const taskResult = task.verificationStatus || task.aiResult;
      if (statusFilter === 'Needs Review') {
        if (task.status !== 'Under Review' && task.verificationStatus !== 'Review Required') return false;
      } else if (statusFilter === 'Flagged') {
        if (taskResult !== 'Failed' || task.status === 'Rejected') return false;
      } else if (statusFilter === 'Settled') {
        if (task.paymentStatus !== 'Settled' && task.paymentStatus !== 'Released' && task.status !== 'Completed') return false;
      } else if (statusFilter !== 'All' && taskResult !== statusFilter) {
        return false;
      }

      if (locationFilter !== 'All' && task.location !== locationFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, localSearch, statusFilter, locationFilter]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    addToast('Report Exported', `Generated operational task audit export (${filteredTasks.length} records).`, 'info');
  };

  return (
    <div className="space-y-6 animate-card-open">
      {/* Precision Operations Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Task Management Grid
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Browse physical verification dispatches, filter cryptographic consensus outcomes and inspect field evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition-all shadow-2xs hover:shadow-sm hover:-translate-y-0.5"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Audit CSV</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="relative group overflow-hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 hover:from-slate-900 hover:via-blue-950 hover:to-blue-800 text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(15,23,42,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(30,64,175,0.45)] border border-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-90 transition-transform duration-300" />
            <span>Create Task Dispatch</span>
          </button>
        </div>
      </div>

      {/* Stitch Category Segment Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-2 border border-slate-200/90 shadow-sm">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-slate-600 text-xs">
          <button
            onClick={() => {
              setStatusFilter('All');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>All Tasks</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${statusFilter === 'All' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => {
              setStatusFilter('Needs Review');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'Needs Review'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>Needs Review</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${statusFilter === 'Needs Review' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
              {counts.review}
            </span>
          </button>

          <button
            onClick={() => {
              setStatusFilter('Flagged');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'Flagged'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>Critical Flags</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${statusFilter === 'Flagged' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
              {counts.flagged}
            </span>
          </button>

          <button
            onClick={() => {
              setStatusFilter('Settled');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'Settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>Settled</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${statusFilter === 'Settled' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {counts.settled}
            </span>
          </button>
        </div>

        {/* Location Dropdown */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-slate-400 font-mono text-[11px] uppercase font-bold">Zone:</span>
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="All">All Zones ({tasks.length})</option>
            <option value="Pune">Pune Sector</option>
            <option value="Mumbai">Mumbai Hub</option>
            <option value="Nashik">Nashik Region</option>
            <option value="Nagpur">Nagpur Logistics</option>
          </select>
        </div>
      </div>

      {/* Filter and Search Bar with ⌘K */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 text-xs border border-slate-200/90 shadow-sm">
        <div className="relative flex-1 max-w-md group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by Task ID, title, worker, zone, or hash..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-14 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-white border border-slate-200 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded shadow-2xs font-semibold">
            ⌘K
          </kbd>
        </div>

        {(statusFilter !== 'All' || locationFilter !== 'All' || localSearch) && (
          <button
            onClick={() => {
              setStatusFilter('All');
              setLocationFilter('All');
              setLocalSearch('');
              setCurrentPage(1);
            }}
            className="text-blue-600 hover:text-blue-800 transition-colors font-bold text-xs self-end md:self-auto"
          >
            Reset All Filters
          </button>
        )}
      </div>

      {/* Main Tasks Table with Heavy Hover Lift */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="table-header border-b border-slate-200/90">
                <th className="py-3 px-5 font-bold text-slate-500">Task ID</th>
                <th className="py-3 px-5 font-bold text-slate-500">Task Title & Details</th>
                <th className="py-3 px-5 font-bold text-slate-500">Specialist</th>
                <th className="py-3 px-5 font-bold text-slate-500">Location</th>
                <th className="py-3 px-5 font-bold text-slate-500">Submitted</th>
                <th className="py-3 px-5 font-bold text-slate-500">AI Result</th>
                <th className="py-3 px-5 font-bold text-slate-500">Confidence</th>
                <th className="py-3 px-5 font-bold text-slate-500">Budget</th>
                <th className="py-3 px-5 font-bold text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-700">No tasks match the filter criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting your search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const workerObj = task.worker || {
                    name: task.assignedWorker?.name || 'Unassigned',
                    avatar: task.assignedWorker?.avatar || 'UW',
                    rating: task.assignedWorker?.rating || 5.0,
                  };
                  const taskIdDisplay = task.taskId || task.id;
                  const taskTitleDisplay = task.title || task.name;
                  const aiResultDisplay = task.verificationStatus || task.aiResult || 'Pending';
                  const budgetDisplay = typeof task.budget === 'number' ? `$${task.budget.toFixed(2)}` : task.budget;

                  return (
                    <tr
                      key={taskIdDisplay}
                      onClick={() => setActiveTaskForDetail(task)}
                      className="table-row-hover cursor-pointer group"
                    >
                      {/* Task ID */}
                      <td className="py-4 px-5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {taskIdDisplay}
                      </td>

                      {/* Task Title */}
                      <td className="py-4 px-5 max-w-sm">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {taskTitleDisplay}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                          {task.description}
                        </div>
                      </td>

                      {/* Worker */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-slate-900 text-[10px] font-bold text-white flex items-center justify-center border border-slate-700 shadow-2xs">
                            {workerObj.avatar || (workerObj.name ? workerObj.name.charAt(0) : 'U')}
                          </span>
                          <div>
                            <div className="text-slate-800 font-semibold">{workerObj.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">★ {workerObj.rating}</div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-5 whitespace-nowrap text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{task.location}</span>
                        </div>
                      </td>

                      {/* Submitted / Deadline */}
                      <td className="py-4 px-5 font-mono whitespace-nowrap">
                        <div className="text-slate-700 font-medium">{task.submitted}</div>
                        <div className="text-[10px] text-slate-400">{task.date}</div>
                      </td>

                      {/* AI Result */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <StatusBadge status={aiResultDisplay} />
                      </td>

                      {/* Confidence */}
                      <td className="py-4 px-5 whitespace-nowrap font-mono">
                        {task.confidenceScore > 0 ? (
                          <span
                            className={`font-bold ${
                              task.confidenceScore >= 90
                                ? 'text-emerald-600'
                                : task.confidenceScore >= 60
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {task.confidenceScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Evaluating...</span>
                        )}
                      </td>

                      {/* Budget & Payment Status */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-mono text-slate-900 font-bold">{budgetDisplay}</div>
                        <StatusBadge status={task.paymentStatus} showDot={false} size="xs" />
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTaskForDetail(task);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-semibold transition-all duration-200 shadow-2xs hover:shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskToDelete(task);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete task (Two-Step Verification)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200/90 bg-white flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredTasks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-800">
              {Math.min(currentPage * itemsPerPage, filteredTasks.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{filteredTasks.length}</strong> tasks
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all ${
                  currentPage === page
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Step Verification Delete Modal */}
      {taskToDelete && (
        <DeleteTaskModal
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          task={taskToDelete}
          onConfirmDelete={async (id) => {
            await deleteTask(id);
            setTaskToDelete(null);
          }}
        />
      )}
    </div>
  );
};
