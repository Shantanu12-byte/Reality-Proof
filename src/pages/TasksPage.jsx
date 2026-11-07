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
      if (statusFilter !== 'All' && taskResult !== statusFilter) {
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EEF2F6]">
        <div>
          <h1 className="font-reckless text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Browse physical verification dispatches, filter inspection outcomes and investigate audit evidence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-bold transition-all shadow-2xs hover:shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#6C5DD3]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold tracking-tight shadow-md shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 text-xs card-hover">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by ID, task title, worker or location..."
            className="w-full bg-[#F6F8FC] border border-[#E9EFF6] rounded-full pl-10 pr-9 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5DD3] focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all font-medium"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-mono"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#6C5DD3] focus:bg-white"
            >
              <option value="All">All Results ({tasks.length})</option>
              <option value="Verified">Verified</option>
              <option value="Review Required">Review Required</option>
              <option value="Failed">Failed / Flagged</option>
              <option value="Pending">Pending Evidence</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-semibold">Zone:</span>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#6C5DD3] focus:bg-white"
            >
              <option value="All">All Zones</option>
              <option value="Pune">Pune</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Nashik">Nashik</option>
              <option value="Nagpur">Nagpur</option>
            </select>
          </div>

          {/* Clear Filter button if active */}
          {(statusFilter !== 'All' || locationFilter !== 'All' || localSearch) && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setLocationFilter('All');
                setLocalSearch('');
                setCurrentPage(1);
              }}
              className="text-[#6C5DD3] hover:text-purple-700 transition-colors font-bold text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Tasks Table */}
      <div className="card-surface rounded-2xl overflow-hidden card-hover">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="table-header border-b border-[#EEF2F6]">
                <th className="py-3 px-5 font-bold text-slate-500">Task ID</th>
                <th className="py-3 px-5 font-bold text-slate-500">Task Title & Details</th>
                <th className="py-3 px-5 font-bold text-slate-500">Worker</th>
                <th className="py-3 px-5 font-bold text-slate-500">Location</th>
                <th className="py-3 px-5 font-bold text-slate-500">Submitted</th>
                <th className="py-3 px-5 font-bold text-slate-500">AI Result</th>
                <th className="py-3 px-5 font-bold text-slate-500">Confidence</th>
                <th className="py-3 px-5 font-bold text-slate-500">Budget</th>
                <th className="py-3 px-5 font-bold text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F4F9]">
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
                    name: task.assignedWorker?.name || 'Unassigned Worker',
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
                      <td className="py-4 px-5 font-mono font-bold text-[#6C5DD3] whitespace-nowrap">
                        {taskIdDisplay}
                      </td>

                      {/* Task Title */}
                      <td className="py-4 px-5 max-w-sm">
                        <div className="font-semibold text-slate-800 group-hover:text-[#6C5DD3] transition-colors truncate">
                          {taskTitleDisplay}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                          {task.description}
                        </div>
                      </td>

                      {/* Worker */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-purple-50 text-[10px] font-bold text-[#6C5DD3] flex items-center justify-center border border-purple-100 shadow-2xs">
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
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#6C5DD3] text-slate-700 hover:text-white text-xs font-semibold transition-all duration-200 shadow-2xs hover:shadow-sm"
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
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
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
        <div className="p-4 sm:p-5 border-t border-[#EEF2F6] bg-white flex items-center justify-between flex-wrap gap-3 text-xs">
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
              className="p-2 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all ${
                  currentPage === page
                    ? 'bg-[#6C5DD3] text-white shadow-sm shadow-purple-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-[#E2E8F0]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
