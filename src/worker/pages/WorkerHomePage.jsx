import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../auth/WorkerAuthContext';
import { workerApi } from '../services/workerApi';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  ChevronRight,
  Calendar,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Satellite,
  Lock,
  Cpu,
  BatteryCharging,
  Zap,
  ArrowUpRight,
  Layers,
  AlertTriangle
} from 'lucide-react';

export const WorkerHomePage = () => {
  const { currentWorker, refreshWorker } = useWorkerAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('Assigned');
  const [error, setError] = useState(null);
  const [onDuty, setOnDuty] = useState(true);

  const loadTasks = useCallback(async () => {
    if (!currentWorker?.workerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await workerApi.getTasks({
        status: selectedTab !== 'All' ? selectedTab : undefined,
      });
      const taskList = res.data || (Array.isArray(res) ? res : []);
      setTasks(taskList);
    } catch (err) {
      console.error('[WorkerHome] Error fetching tasks:', err);
      setError(err.message || 'Failed to retrieve assigned tasks');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorker?.workerId, selectedTab]);

  useEffect(() => {
    loadTasks();
    refreshWorker();
  }, [loadTasks, refreshWorker]);

  const stats = currentWorker?.stats || {
    activeTasks: 0,
    submittedTasks: 0,
    completedTasks: currentWorker?.completedJobs || 0,
    pendingVerificationCount: 0,
    availableBalance: currentWorker?.balance || 0,
  };

  const tabs = [
    { id: 'Assigned', label: 'Assigned' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Submitted', label: 'Submitted' },
    { id: 'Completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-4 animate-card-open">
      {/* Telemetry Bar & Specialist Shift Status Widget */}
      <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm flex flex-col gap-3.5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-surface-container-high text-primary flex items-center justify-center font-bold text-sm shadow-sm border border-outline-variant/20 shrink-0">
              {currentWorker?.avatar || (currentWorker?.name ? currentWorker.name.slice(0, 2).toUpperCase() : 'WR')}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans text-base sm:text-lg font-bold text-on-surface truncate">
                  {currentWorker?.name || 'Field Specialist'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-mono text-[10px] font-bold">
                  {currentWorker?.workerId}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
                <span className="font-medium">Attested Specialist Tier</span>
                <span className="text-outline-variant">•</span>
                <span className="font-mono text-primary font-semibold">★ {currentWorker?.rating || 4.9}</span>
                <span className="text-outline-variant">•</span>
                <span className="font-medium truncate">{currentWorker?.city || 'Pune Sector'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setOnDuty(!onDuty);
              loadTasks();
              refreshWorker();
            }}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0 font-mono text-[11px] font-bold shadow-xs ${
              onDuty
                ? 'bg-tertiary/10 text-tertiary border border-tertiary/30 hover:bg-tertiary/20'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
            }`}
            title="Toggle Duty & Refresh Telemetry"
          >
            {onDuty ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary shadow-[0_0_8px_#007e56]" />
                </span>
                <span>ON DUTY</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40" />
                <span>OFF DUTY</span>
              </>
            )}
            <RefreshCw className={`w-3 h-3 ml-0.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Hardware & RTK Sensor Micro-pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-outline-variant/20 font-mono text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/20">
            <Satellite className="w-4 h-4 text-secondary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase text-on-surface-variant font-bold">RTK CEP Lock</span>
              <span className="font-bold text-secondary truncate">0.38m (Accurate)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/20">
            <Lock className="w-4 h-4 text-tertiary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase text-on-surface-variant font-bold">HW Enclave</span>
              <span className="font-bold text-tertiary truncate">FIDO2 Active</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/20">
            <Cpu className="w-4 h-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase text-on-surface-variant font-bold">Constellation</span>
              <span className="font-bold text-primary truncate">14 GNSS Sats</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/20">
            <BatteryCharging className="w-4 h-4 text-on-surface-variant shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase text-on-surface-variant font-bold">Power Cell</span>
              <span className="font-bold text-on-surface truncate">92% • Healthy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Escrow & Daily Payout Hub */}
      <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-sans text-xs font-bold text-on-surface uppercase tracking-wider">
              Settlement Ledger
            </span>
          </div>
          <span className="font-mono text-[11px] text-tertiary flex items-center gap-1.5 font-bold bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_6px_#007e56]" />
            Chain Sync OK
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 py-1">
          <div className="flex flex-col p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold truncate">Available</span>
            <span className="font-sans text-lg sm:text-xl font-bold text-on-surface mt-0.5 truncate">
              ${Number(stats.availableBalance || 0).toFixed(2)}
            </span>
            <span className="font-mono text-[10px] text-tertiary font-semibold truncate mt-0.5">+Ready to Draw</span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold truncate">In Escrow</span>
            <span className="font-sans text-lg sm:text-xl font-bold text-primary mt-0.5 truncate">
              ${((stats.activeTasks || 0) * 45).toFixed(2)}
            </span>
            <span className="font-mono text-[10px] text-primary font-semibold truncate mt-0.5">{stats.activeTasks} Locked</span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold truncate">Completed</span>
            <span className="font-sans text-lg sm:text-xl font-bold text-secondary mt-0.5 truncate">
              {stats.completedTasks}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant font-semibold truncate mt-0.5">Verified Jobs</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant/20">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-xs min-w-0">
            <Zap className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span className="truncate">Instant PayPal Sandbox Cashout</span>
          </div>
          <NavLink
            to="/worker/profile"
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-sans text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-4px_rgba(108,93,211,0.45)]"
          >
            <span>View Payouts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </section>

      {/* Filter & Segment Chips */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-sans text-base font-bold text-on-surface">
          Field Dispatches ({tasks.length})
        </h2>
        <span className="font-mono text-[11px] text-on-surface-variant font-semibold">
          Zone: {currentWorker?.city || 'Pune Sector B-4'}
        </span>
      </div>

      {/* Horizontal Filter Tabs */}
      <div className="bg-surface-container rounded-xl p-1.5 border border-outline-variant/30 flex items-center gap-1 overflow-x-auto text-xs">
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-surface-container-lowest rounded-xl p-10 text-center border border-outline-variant/30 shadow-sm text-xs text-on-surface-variant">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-primary" />
            Syncing field dispatch queue...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-10 text-center border border-outline-variant/30 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center mx-auto border border-outline-variant/30">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-on-surface">
                No {selectedTab} Tasks Found
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
                You currently have no tasks in the "{selectedTab}" state. Check other tabs or contact dispatch operations.
              </p>
            </div>
            {selectedTab !== 'Assigned' && (
              <button
                onClick={() => setSelectedTab('Assigned')}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors active:scale-95"
              >
                View Assigned Tasks
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const statusColor =
                task.verificationStatus === 'Verified' || task.status === 'Completed'
                  ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                  : task.status === 'Under Review' || task.verificationStatus === 'Review Required'
                  ? 'bg-secondary/10 text-secondary border-secondary/30'
                  : task.status === 'In Progress'
                  ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                  : 'bg-surface-container text-on-surface border-outline-variant/30';

              const budgetDisplay =
                typeof task.budget === 'number' ? `$${task.budget.toFixed(2)}` : task.budget;

              return (
                <div
                  key={task.taskId || task.id}
                  className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm hover:border-primary/50 hover:shadow-[0px_12px_32px_-4px_rgba(108,93,211,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-3.5 group cursor-pointer"
                  onClick={() => navigate(`/worker/tasks/${task.taskId || task.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-primary bg-primary-fixed/40 px-2.5 py-0.5 rounded-full border border-primary/20">
                          {task.taskId || task.id}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                          {task.verificationStatus !== 'Pending' ? task.verificationStatus : task.status}
                        </span>
                        {task.priority === 'High' && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-error-container text-error border border-error/20">
                            Critical Priority
                          </span>
                        )}
                      </div>
                      <h3 className="font-sans text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
                        {task.title || task.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {task.description || 'Follow evidence capture requirements and upload in-situ photos.'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-sans text-base font-bold text-on-surface">
                        {budgetDisplay}
                      </div>
                      <span className="text-[10px] font-mono text-on-surface-variant">Escrow Locked</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-none">
                        {task.location || task.city || 'Pune Sector'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-primary font-bold group-hover:translate-x-1 transition-transform">
                      <span>Inspect & Submit</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerHomePage;
