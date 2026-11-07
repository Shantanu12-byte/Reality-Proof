import React from 'react';
import { Star, ShieldCheck, ArrowRight, UserCheck, Users } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { Link } from 'react-router-dom';

export const WorkerSummary = () => {
  const { workers } = useTaskContext();
  const sourceWorkers = workers || [];
  const topWorkers = [...sourceWorkers]
    .sort((a, b) => (b.completedJobs || b.tasksCompleted || 0) - (a.completedJobs || a.tasksCompleted || 0))
    .slice(0, 4);

  return (
    <div className="card-surface rounded-2xl p-5 sm:p-6 card-hover flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F9] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-reckless text-xl font-bold text-slate-900 tracking-tight">Worker Performance</h3>
            <p className="text-xs text-slate-500 font-medium">Top-rated active field inspectors by accuracy</p>
          </div>
        </div>
        <Link
          to="/workers"
          className="text-xs text-[#6C5DD3] hover:text-purple-700 flex items-center gap-1 font-bold transition-colors"
        >
          <span>All workers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {topWorkers.length === 0 ? (
          <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#EEF2F6]">
            <Users className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <p className="text-xs text-slate-500">Connecting to registered inspectors...</p>
          </div>
        ) : (
          topWorkers.map((worker) => {
            const workerKey = worker.workerId || worker.id || worker._id;
            const accuracyVal = worker.accuracy !== undefined ? `${worker.accuracy}%` : (worker.verifiedRate || '100%');
            const completedCount = worker.completedJobs !== undefined ? worker.completedJobs : (worker.tasksCompleted || 0);

            return (
              <div
                key={workerKey}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] hover:bg-white hover:border-purple-200 hover:shadow-sm transition-all duration-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C5DD3] to-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/15">
                    {worker.avatar || (worker.name ? worker.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'W')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-slate-800 truncate">{worker.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({worker.city || worker.location})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{worker.rating || 5.0}</span>
                      </span>
                      <span>•</span>
                      <span>{completedCount} tasks completed</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {accuracyVal}
                  </span>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                    Accuracy
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
