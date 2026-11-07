import React from 'react';
import { ExternalLink, ArrowRight, Eye } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useTaskContext } from '../../context/TaskContext';
import { Link } from 'react-router-dom';

export const RecentActivityTable = ({ limit = 5 }) => {
  const { tasks, setActiveTaskForDetail, searchQuery } = useTaskContext();

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.worker.name.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q)
    );
  }).slice(0, limit);

  return (
    <div className="card-surface rounded-2xl overflow-hidden card-hover">
      {/* Header */}
      <div className="p-5 sm:p-6 flex items-center justify-between border-b border-[#F1F4F9] bg-white">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-reckless text-xl font-bold text-slate-900 tracking-tight">
              Recent Verification Activity
            </h3>
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-[#6C5DD3] border border-purple-100">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Physical field task verification records and automated AI decisions
          </p>
        </div>

        <Link
          to="/tasks"
          className="text-xs font-bold text-[#6C5DD3] hover:text-purple-700 flex items-center gap-1 transition-colors"
        >
          <span>View all tasks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="table-header border-b border-[#EEF2F6]">
              <th className="py-3 px-5 font-bold text-slate-500">Task ID</th>
              <th className="py-3 px-5 font-bold text-slate-500">Task Name</th>
              <th className="py-3 px-5 font-bold text-slate-500">Assigned Worker</th>
              <th className="py-3 px-5 font-bold text-slate-500">Location</th>
              <th className="py-3 px-5 font-bold text-slate-500">Submitted</th>
              <th className="py-3 px-5 font-bold text-slate-500">AI Result</th>
              <th className="py-3 px-5 font-bold text-slate-500">Payment Status</th>
              <th className="py-3 px-5 font-bold text-slate-500 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F4F9] font-normal">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No matching tasks found.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const workerObj = task.worker || {
                  name: task.assignedWorker?.name || 'Unassigned Inspector',
                  avatar: task.assignedWorker?.avatar || 'UI',
                };
                const taskIdDisplay = task.taskId || task.id;
                const taskTitleDisplay = task.title || task.name;
                const aiResultDisplay = task.verificationStatus || task.aiResult || 'Pending';

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

                    {/* Task Name */}
                    <td className="py-4 px-5 font-semibold text-slate-800 max-w-xs truncate">
                      <span className="group-hover:text-[#6C5DD3] transition-colors">
                        {taskTitleDisplay}
                      </span>
                    </td>

                    {/* Assigned Worker */}
                    <td className="py-4 px-5 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-purple-50 text-[10px] font-bold text-[#6C5DD3] flex items-center justify-center border border-purple-100 shadow-2xs">
                          {workerObj.avatar || (workerObj.name ? workerObj.name.charAt(0) : 'U')}
                        </span>
                        <span className="font-medium">{workerObj.name}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        {task.location}
                      </span>
                    </td>

                    {/* Submitted */}
                    <td className="py-4 px-5 text-slate-500 font-mono whitespace-nowrap">
                      {task.submitted}
                    </td>

                    {/* AI Result */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge status={aiResultDisplay} />
                    </td>

                    {/* Payment Status */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge status={task.paymentStatus} showDot={false} size="xs" />
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
