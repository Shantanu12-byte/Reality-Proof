import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useWorkerAuth } from '../auth/WorkerAuthContext';
import { workerApi } from '../services/workerApi';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Wallet,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Cpu,
  Radio
} from 'lucide-react';

export const WorkerTaskDetailPage = () => {
  const { taskId, id } = useParams();
  const effectiveId = taskId || id;
  const navigate = useNavigate();
  const { currentWorker } = useWorkerAuth();

  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadTask = useCallback(async () => {
    if (!effectiveId || !currentWorker?.workerId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await workerApi.getTaskById(effectiveId);
      setTask(res.data || res);
    } catch (err) {
      console.error('[WorkerTaskDetail] Error loading task:', err);
      setErrorMsg(err.message || 'Failed to load task details.');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveId, currentWorker?.workerId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200/90 shadow-2xs text-xs text-slate-500 font-plus">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-blue-600" />
        Loading mission specifications &amp; hardware attestation...
      </div>
    );
  }

  if (errorMsg || !task) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-slate-200/90 shadow-2xs space-y-3 font-plus">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Task Inaccessible</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMsg || 'Task not found in active cluster registry.'}</p>
        <button
          onClick={() => navigate('/worker')}
          className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          Return to My Tasks
        </button>
      </div>
    );
  }

  const requirements = task.evidenceRequirements || [];
  const completedCount = requirements.filter((r) => r.status === 'verified').length;
  const totalCount = requirements.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const budgetDisplay =
    typeof task.budget === 'number' ? `$${task.budget.toFixed(2)}` : task.budget;

  return (
    <div className="space-y-4 animate-in fade-in duration-200 font-plus">
      {/* Top Navigation Back Action */}
      <button
        onClick={() => navigate('/worker')}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors py-1 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Return to Field Hub</span>
      </button>

      {/* Task Header Card */}
      <div className="stitch-card-hover bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {task.taskId || task.id}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  task.verificationStatus === 'Verified'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : task.status === 'Under Review'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {task.verificationStatus !== 'Pending' ? task.verificationStatus : task.status}
              </span>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                TPM 2.0 ATTESTED
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {task.title || task.name}
            </h1>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-2xl font-bold text-emerald-700 block">
              {budgetDisplay}
            </span>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Escrow Locked</span>
          </div>
        </div>

        {/* Location & Time Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs pt-3 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="font-mono text-[9px] uppercase font-bold text-slate-400 mb-0.5">Site Coordinates</div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{task.location}</span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 truncate mt-0.5">
              {task.address || `${task.location} Sector 4`}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="font-mono text-[9px] uppercase font-bold text-slate-400 mb-0.5">Dispatch Window</div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-mono">{task.deadline || 'Today 18:00'}</span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 mt-0.5">
              Category: {task.category || 'Visual Inspection'}
            </div>
          </div>
        </div>
      </div>

      {/* Scope & Instructions */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          Inspection Scope &amp; Field Invariants
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
          {task.description ||
            'Verify that physical subject conforms to structural integrity guidelines. Capture clear, non-occluded photographic evidence with authentic hardware timestamp and live GNSS fix.'}
        </p>
      </div>

      {/* Evidence Requirements Checklist */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Required Evidence Checklist
            </h3>
            <p className="font-mono text-[11px] text-slate-500">
              {completedCount} of {requirements.length} required assets verified
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(progressPercent, 4)}%` }}
          />
        </div>

        {/* Requirements Checklist Items */}
        <div className="space-y-2">
          {requirements.map((req, idx) => {
            const isDone = req.status === 'verified';
            const isFlagged = req.status === 'flagged' || req.status === 'failed';

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs transition-all flex items-start justify-between gap-3 ${
                  isDone
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : isFlagged
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : 'bg-slate-50 border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isFlagged ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center font-mono text-[9px] font-bold text-slate-400">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{req.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-mono">
                      {req.description || 'Photographic proof required for verification'}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : isFlagged
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {req.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment & Earnings Settlement Lifecycle */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Escrow Settlement Protocol
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {task.paymentStatus === 'Completed' ? 'SETTLED' : task.verificationStatus === 'Verified' ? 'READY FOR PAYOUT' : 'AUTHORIZED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="font-mono text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Disbursement Gate</span>
            <span className={`font-semibold ${task.verificationStatus === 'Verified' ? 'text-emerald-700' : 'text-slate-700'}`}>
              {task.verificationStatus === 'Verified' ? '✓ Eligible for Instant Payout' : 'Pending Multi-Modal AI Check'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="font-mono text-[9px] text-slate-400 uppercase font-bold block mb-0.5">PayPal Sandbox Status</span>
            <span className={`font-semibold ${task.paymentStatus === 'Completed' ? 'text-blue-700' : 'text-amber-700'}`}>
              {task.paymentStatus === 'Completed' ? 'Dispatched / Settled' : 'Awaiting Settlement'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 text-[11px] text-blue-900 leading-relaxed font-mono">
          <p>
            <strong>Zero-Trust Note:</strong> Authorized budget ({budgetDisplay}) is captured into worker balance upon multi-modal consensus.
          </p>
        </div>
      </div>

      {/* Captured Evidence Thumbnails */}
      {task.evidenceThumbnails && task.evidenceThumbnails.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Captured Proof Assets ({task.evidenceThumbnails.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">SHA-256 Attested</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {task.evidenceThumbnails.map((url, i) => (
              <div
                key={i}
                className="relative rounded-lg overflow-hidden aspect-video bg-slate-900 border border-slate-200 shadow-2xs group"
              >
                <img
                  src={url}
                  alt={`Asset ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2">
                  <span className="font-mono text-[10px] text-white">Asset #{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Bottom Touch Action Button */}
      <div className="sticky bottom-16 md:bottom-4 z-20 pt-2">
        <NavLink
          to={`/worker/tasks/${task.taskId || task.id}/submit`}
          className="stitch-btn-primary group relative overflow-hidden w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 min-h-[50px] active:scale-[0.98]"
        >
          <span className="stitch-shimmer"></span>
          <Camera className="w-5 h-5 text-blue-300" />
          <span>{task.evidenceThumbnails?.length > 0 ? 'Upload More Evidence' : 'Start Evidence Capture'}</span>
        </NavLink>
      </div>
    </div>
  );
};

export default WorkerTaskDetailPage;
