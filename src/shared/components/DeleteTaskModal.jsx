import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2, ShieldAlert, Fingerprint } from 'lucide-react';

export const DeleteTaskModal = ({ isOpen, onClose, task, onConfirmDelete }) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !task) return null;

  const taskId = task.taskId || task.id;
  const taskTitle = task.title || task.name || 'Untitled Task';
  const isConfirmed = confirmationInput.trim().toLowerCase() === 'delete';

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput('');
    setErrorMsg('');
    onClose();
  };

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await onConfirmDelete(taskId);
      setConfirmationInput('');
      onClose();
    } catch (err) {
      console.error('[DeleteTaskModal] Failed to delete task:', err);
      setErrorMsg(err.message || 'Failed to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-[0_24px_48px_-12px_rgba(30,41,59,0.25)] flex flex-col gap-4 border-2 border-red-200 z-10 animate-in zoom-in-95 duration-200 stitch-modal-open">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-inner shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[11px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Irreversible Action
              </span>
              <h3 className="font-sans text-xl font-extrabold text-slate-900 mt-0.5">
                Purge Task & Quarantine Record
              </h3>
              <p className="font-mono text-xs text-slate-500">
                Task Ref: {taskId} • {taskTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Alert Banner */}
        <div className="bg-red-50/80 p-4 rounded-xl flex flex-col gap-1.5 text-red-900 border border-red-200">
          <p className="text-xs font-bold flex items-center gap-1.5 text-red-800">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            Critical Enclave Revocation Notice
          </p>
          <p className="text-xs leading-relaxed text-slate-600 font-medium">
            This will purge photographic evidence, cryptographic attestation proofs, and sensor logs for <strong className="text-slate-900 font-semibold">{taskTitle}</strong> ({taskId}). Historical escrow allocations will be permanently quarantined.
          </p>
        </div>

        {/* Telemetry metadata block */}
        <div className="bg-slate-50 p-3 rounded-xl flex flex-col gap-1.5 font-mono text-xs border border-slate-200/80">
          <div className="flex items-center justify-between py-1 px-2.5 bg-white rounded-lg border border-slate-100">
            <span className="text-slate-500">Task Identifier:</span>
            <span className="font-bold text-blue-900 font-mono">{taskId}</span>
          </div>
          <div className="flex items-center justify-between py-1 px-2.5 bg-white rounded-lg border border-slate-100">
            <span className="text-slate-500">Assigned Zone:</span>
            <span className="font-semibold text-slate-800">{task.location || task.city || 'India Logistics Hub'}</span>
          </div>
          <div className="flex items-center justify-between py-1 px-2.5 bg-white rounded-lg border border-slate-100">
            <span className="text-slate-500">Target Budget / Escrow:</span>
            <span className="font-bold text-red-600">${task.budget || '45.00'} USD</span>
          </div>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Step 2 Verification Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Type <span className="font-mono text-red-600 font-bold px-1.5 py-0.5 rounded bg-red-50 border border-red-200">delete</span> to unlock action:
          </label>
          <input
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={isDeleting}
            placeholder='Type "delete" to confirm'
            autoFocus
            className={`w-full bg-slate-50 px-4 py-2.5 rounded-xl font-mono text-xs text-slate-900 outline-none focus:ring-2 text-center tracking-widest transition-all placeholder:tracking-normal placeholder:font-sans border ${
              isConfirmed
                ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 focus:ring-emerald-500'
                : 'border-slate-200 focus:bg-white focus:border-red-400 focus:ring-red-400'
            }`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel / Abort
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-sans text-xs font-bold shadow-[0_8px_20px_-4px_rgba(186,26,26,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isConfirmed || isDeleting ? 'opacity-40 cursor-not-allowed shadow-none' : 'hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Purging Task...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Purge & Quarantine</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
