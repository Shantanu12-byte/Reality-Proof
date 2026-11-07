import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '@/context/TaskContext';
import { StatusBadge } from '../common/StatusBadge';
import { DeleteTaskModal } from '@/shared/components/DeleteTaskModal';
import {
  X,
  MapPin,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Camera,
  ExternalLink,
  Clock,
  HelpCircle,
  Zap,
  Check,
  Trash2,
  Radio,
  Cpu
} from 'lucide-react';

export const TaskDetailDrawer = () => {
  const navigate = useNavigate();
  const { activeTaskForDetail, setActiveTaskForDetail, updateTask, deleteTask, addToast } = useTaskContext();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!activeTaskForDetail) return null;

  const task = activeTaskForDetail;

  const handleStatusOverride = async (newResult, newPaymentStatus, toastMsg) => {
    const targetId = task.taskId || task.id;
    await updateTask(
      targetId,
      {
        verificationStatus: newResult,
        aiResult: newResult,
        paymentStatus: newPaymentStatus,
      },
      toastMsg
    );
  };

  const handlePayPalPayoutRelease = () => {
    const workerName = task.worker?.name || task.assignedWorker?.name || 'field inspector';
    handleStatusOverride(
      'Verified',
      'Completed',
      `PayPal escrow released: ${task.budget} transferred to ${workerName}.`
    );
  };

  const handleRejectTask = () => {
    handleStatusOverride(
      'Rejected',
      'Not Eligible',
      `Task ${task.taskId || task.id} rejected. Critical flag removed.`
    );
  };

  const handleRequestRecapture = () => {
    const workerName = task.worker?.name || task.assignedWorker?.name || 'field inspector';
    handleStatusOverride(
      'Review Required',
      'Pending',
      `Notification sent to ${workerName} requesting re-capture with verified GPS lock.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setActiveTaskForDetail(null)}
      />

      {/* Drawer Panel */}
      <div className="stitch-drawer-open relative w-full max-w-xl bg-white border-l border-slate-200/90 shadow-2xl z-10 flex flex-col h-full overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {task.id}
              </span>
              <StatusBadge status={task.aiResult} />
              <StatusBadge status={task.paymentStatus} showDot={false} size="xs" />
              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                TPM 2.0 OK
              </span>
            </div>
            <h2 className="font-plus text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {task.name}
            </h2>
          </div>
          <button
            onClick={() => setActiveTaskForDetail(null)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs font-plus">
          {/* Exception Banner if exists */}
          {task.exceptionReason && (task.verificationStatus === 'Rejected' || task.status === 'Rejected') ? (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Task Rejected — Critical Flag Resolved</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 font-mono">
                {task.exceptionReason}
              </p>
            </div>
          ) : task.exceptionReason ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-700 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>AI Verification Flagged</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-800 font-mono">
                {task.exceptionReason}
              </p>
            </div>
          ) : null}

          {/* AI Confidence Meter */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                AI Inference Confidence Score
              </span>
              <span className="font-mono text-xl font-bold text-slate-900">
                {task.confidenceScore}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  task.confidenceScore >= 90
                    ? 'bg-emerald-500'
                    : task.confidenceScore >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(task.confidenceScore, 4)}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mt-2">
              <span>Failure &lt;50%</span>
              <span>Manual Review 50-89%</span>
              <span className="text-emerald-700 font-bold">Verified &ge;90%</span>
            </div>
          </div>

          {/* Operational Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-mono text-[10px] uppercase font-bold text-slate-400">Location</div>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{task.location}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {task.address}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-mono text-[10px] uppercase font-bold text-slate-400">Budget &amp; Escrow</div>
              <div className="font-mono text-base font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <span>{task.budget} USD</span>
              </div>
              <div className="font-mono text-[10px] text-blue-700 mt-0.5 font-semibold">
                PayPal: Escrow Active
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-mono text-[10px] uppercase font-bold text-slate-400">Assigned Worker</div>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{task.worker?.name || task.assignedWorker?.name || 'Assigned Worker'}</span>
              </div>
              <div className="font-mono text-[10px] text-slate-500 mt-1">
                ★ {task.worker?.rating || 5.0} • {task.worker?.tasksCompleted || 0} jobs
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-mono text-[10px] uppercase font-bold text-slate-400">Submission Time</div>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{task.submitted || 'Recent'}</span>
              </div>
              <div className="font-mono text-[10px] text-slate-500 mt-1">
                Date: {task.date || 'Today'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Task Scope &amp; Description
            </h4>
            <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed text-xs">
              {task.description}
            </p>
          </div>

          {/* Multi-Layer AI Verification Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Multi-Layer AI Verification Pipeline
              </h4>
              <button
                onClick={() => {
                  setActiveTaskForDetail(null);
                  navigate('/admin/verification');
                }}
                className="font-mono text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                <span>Open Studio →</span>
              </button>
            </div>
            <div className="space-y-2">
              {task.requiredEvidence &&
                task.requiredEvidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {ev.status === 'verified' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : ev.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : ev.status === 'flagged' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">{ev.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ev.description}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {ev.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Photographic Evidence */}
          {task.evidenceThumbnails && task.evidenceThumbnails.length > 0 && (
            <div>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Captured Photographic Evidence
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {task.evidenceThumbnails.map((url, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group aspect-video shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2">
                      <span className="font-mono text-[10px] text-white">
                        Asset #{i + 1} • Verified EXIF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Actions Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRejectTask}
              className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
            >
              Reject Task
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Delete task (Two-Step Verification)"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestRecapture}
              className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors"
            >
              Re-Capture
            </button>
            <button
              onClick={handlePayPalPayoutRelease}
              className="stitch-btn-primary group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span className="stitch-shimmer"></span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Approve &amp; Release</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two-Step Verification Delete Modal */}
      {isDeleteModalOpen && (
        <DeleteTaskModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          task={task}
          onConfirmDelete={async (id) => {
            await deleteTask(id);
            setActiveTaskForDetail(null);
          }}
        />
      )}
    </div>
  );
};
