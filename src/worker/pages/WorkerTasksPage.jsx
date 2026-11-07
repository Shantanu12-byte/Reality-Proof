import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useWorkerAuth } from '../auth/WorkerAuthContext';
import { workerApi } from '../services/workerApi';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  ArrowRight,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Layers
} from 'lucide-react';

export const WorkerTasksPage = () => {
  const { currentWorker } = useWorkerAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadTasks = useCallback(async () => {
    if (!currentWorker?.workerId) return;
    setIsLoading(true);
    try {
      const res = await workerApi.getTasks({
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });
      const list = res.data || (Array.isArray(res) ? res : []);
      setTasks(list);
    } catch (err) {
      console.error('[WorkerTasksPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorker?.workerId, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.taskId?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-card-open">
      {/* Header telemetry summary */}
      <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
            Assigned Queue
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            Cryptographically routed to {currentWorker.name} ({currentWorker.workerId})
          </p>
        </div>

        <button
          onClick={loadTasks}
          disabled={isLoading}
          className="p-2.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant transition-all active:scale-95 cursor-pointer shadow-xs"
          title="Refresh task stream"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Search Input with high precision styling */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
        <input
          type="text"
          placeholder="Search by title, task ID or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(108,93,211,0.15)] shadow-xs font-medium placeholder:text-on-surface-variant/50 transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="bg-surface-container rounded-xl p-1 border border-outline-variant/30 flex items-center gap-1 overflow-x-auto text-xs">
        {['All', 'Assigned', 'In Progress', 'Submitted', 'Completed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === st
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="bg-surface-container-lowest rounded-xl p-10 text-center border border-outline-variant/30 text-xs text-on-surface-variant shadow-sm">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-primary" />
          Synchronizing proof queue...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-10 text-center border border-outline-variant/30 space-y-2 shadow-sm">
          <FileCheck className="w-8 h-8 text-outline-variant mx-auto" />
          <h3 className="font-sans text-base font-bold text-on-surface">No Matching Tasks</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.taskId || task.id}
              className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm hover:border-primary/40 hover:shadow-[0px_12px_32px_-4px_rgba(108,93,211,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-primary bg-primary-fixed/40 px-2.5 py-0.5 rounded-full border border-primary/20">
                      {task.taskId || task.id}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface border border-outline-variant/30">
                      {task.status}
                    </span>
                    {task.priority === 'High' && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-error-container text-error border border-error/20">
                        Critical
                      </span>
                    )}
                  </div>
                  <h3 className="font-sans text-base font-bold text-on-surface leading-snug">
                    {task.title || task.name}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-sans text-base font-bold text-tertiary">
                    {typeof task.budget === 'number' ? `$${task.budget.toFixed(2)}` : task.budget}
                  </span>
                  <div className="text-[10px] font-mono text-on-surface-variant">Escrow Held</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium pt-2 border-t border-outline-variant/20">
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{task.location}</span>
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant/80 shrink-0">
                  {task.deadline || 'Immediate'}
                </span>
              </div>

              <NavLink
                to={`/worker/tasks/${task.taskId || task.id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 hover:shadow-[0_8px_20px_-4px_rgba(108,93,211,0.45)] hover:-translate-y-0.5"
              >
                <span>Inspect Requirements & Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerTasksPage;
