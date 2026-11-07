import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../auth/WorkerAuthContext';
import { workerApi } from '../services/workerApi';
import {
  Camera,
  Image,
  UploadCloud,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  RefreshCw,
  FileCheck,
  Info,
  Sparkles,
  Layers
} from 'lucide-react';

export const WorkerEvidenceCapturePage = () => {
  const { taskId, id } = useParams();
  const effectiveId = taskId || id;
  const navigate = useNavigate();
  const { currentWorker, refreshWorker } = useWorkerAuth();

  const [task, setTask] = useState(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected files & uploaded evidence items: { id, file, previewUrl, serverUrl, requirementLabel, status: 'ready' | 'uploaded' }
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // GPS Metadata state
  const [gpsData, setGpsData] = useState(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsRequested, setGpsRequested] = useState(false);

  // Device telemetry
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'Mobile Device',
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    timestamp: new Date().toISOString(),
  });

  // Submission Flow: 'capture' | 'review' | 'success'
  const [submissionStep, setSubmissionStep] = useState('capture');
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidden file input references
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Load Task Details
  const loadTask = useCallback(async () => {
    if (!effectiveId || !currentWorker?.workerId) return;
    setIsLoadingTask(true);
    try {
      const res = await workerApi.getTaskById(effectiveId);
      const taskData = res.data || res;
      setTask(taskData);
    } catch (err) {
      console.error('[EvidenceCapture] Task fetch error:', err);
      setErrorMsg(err.message || 'Task not found or access denied.');
    } finally {
      setIsLoadingTask(false);
    }
  }, [effectiveId, currentWorker?.workerId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Request GPS Geolocation with transparent permission explanation
  const handleRequestGps = () => {
    setGpsRequested(true);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your current browser.');
      return;
    }

    setIsAcquiringGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsAcquiringGps(false);
        setGpsData({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(position.coords.accuracy),
          acquiredAt: new Date().toISOString(),
        });
      },
      (err) => {
        setIsAcquiringGps(false);
        setGpsError(
          err.code === 1
            ? 'Location permission was declined. Location is optional, submission can still proceed.'
            : 'Could not acquire GPS satellite lock. Try outdoors.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Handle file addition from camera or gallery
  const handleFilesAdded = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const newItems = Array.from(filesList).map((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      const requirements = task?.evidenceRequirements || [];
      // Auto-assign to first unassigned requirement if available
      const unassignedReq = requirements[evidenceItems.length + idx]?.label || 'General Evidence';

      return {
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        serverUrl: null,
        requirementLabel: unassignedReq,
        status: 'ready',
      };
    });

    setEvidenceItems((prev) => [...prev, ...newItems]);
  };

  // Remove photo item
  const handleRemoveItem = (itemId) => {
    setEvidenceItems((prev) => {
      const filtered = prev.filter((item) => item.id !== itemId);
      return filtered;
    });
  };

  // Change requirement label assignment
  const handleRequirementChange = (itemId, newLabel) => {
    setEvidenceItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, requirementLabel: newLabel } : item))
    );
  };

  // Upload photos to server storage
  const uploadPhotosToServer = async () => {
    const unuploaded = evidenceItems.filter((item) => !item.serverUrl);
    if (unuploaded.length === 0) return evidenceItems;

    setIsUploading(true);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      unuploaded.forEach((item) => {
        formData.append('images', item.file);
      });

      setUploadProgress(50);
      const res = await workerApi.uploadEvidence(formData);
      setUploadProgress(85);

      const serverAssets = res.data || (Array.isArray(res) ? res : [res]);

      // Map server URLs back to evidence items
      const updated = evidenceItems.map((item, i) => {
        const matchingAsset = serverAssets[i] || serverAssets[0];
        return {
          ...item,
          serverUrl: item.serverUrl || matchingAsset?.url,
          status: 'uploaded',
        };
      });

      setEvidenceItems(updated);
      setUploadProgress(100);
      return updated;
    } catch (err) {
      console.error('[EvidenceUpload] Upload failed:', err);
      throw new Error(`Failed to upload images to server storage: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Advance to Pre-Submission Review
  const handleProceedToReview = async () => {
    if (evidenceItems.length === 0) {
      setErrorMsg('Please capture or upload at least one evidence photograph.');
      return;
    }
    setErrorMsg('');

    try {
      await uploadPhotosToServer();
      setSubmissionStep('review');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Final Submit to Backend & Trigger AI Verification
  const handleFinalSubmit = async () => {
    if (isSubmitting) return; // Prevent accidental duplicate submission
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        taskId: task.taskId || task.id,
        evidenceList: evidenceItems.map((item) => ({
          requirementLabel: item.requirementLabel,
          url: item.serverUrl,
          notes: `Captured on field device (${deviceInfo.platform})`,
        })),
        submissionMetadata: {
          timestamp: new Date().toISOString(),
          device: deviceInfo,
          gps: gpsData,
        },
      };

      const res = await workerApi.submitEvidence(payload);
      setSubmissionResult(res);
      setSubmissionStep('success');
      await refreshWorker();
    } catch (err) {
      console.error('[EvidenceSubmit] Final submission failed:', err);
      setErrorMsg(err.message || 'Evidence submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingTask) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-[#6C5DD3]" />
        Initializing evidence capture studio...
      </div>
    );
  }

  const requirements = task?.evidenceRequirements || [];
  const assignedLabels = new Set(evidenceItems.map((i) => i.requirementLabel));
  const missingRequirements = requirements.filter((r) => !assignedLabels.has(r.label));

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <button
          onClick={() => {
            if (submissionStep === 'review') setSubmissionStep('capture');
            else navigate(`/worker/tasks/${task?.taskId || id}`);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{submissionStep === 'review' ? 'Back to Capture' : 'Back to Task'}</span>
        </button>

        <span className="font-mono text-xs font-bold text-[#6C5DD3]">
          Step {submissionStep === 'capture' ? '1: Capture' : submissionStep === 'review' ? '2: Review' : '3: Done'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: CAPTURE & UPLOAD INTERFACE */}
      {/* ========================================================================= */}
      {submissionStep === 'capture' && (
        <div className="space-y-5">
          {/* Task Info Pill */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-bold text-[#6C5DD3] uppercase">
                {task?.taskId} • {task?.location}
              </div>
              <h2 className="font-reckless text-lg font-bold text-slate-900">
                {task?.title}
              </h2>
            </div>
            <span className="font-reckless text-lg font-bold text-emerald-700">
              {typeof task?.budget === 'number' ? `$${task.budget.toFixed(2)}` : task?.budget}
            </span>
          </div>

          {/* Touch-Friendly Capture Buttons Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Native Camera Trigger */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFilesAdded(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-5 rounded-3xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white flex flex-col items-center justify-center gap-2 shadow-md shadow-purple-500/25 transition-all group min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="font-bold text-xs">Take Photo</div>
                <div className="text-[10px] text-purple-200">Device Camera</div>
              </div>
            </button>

            {/* Gallery Upload Trigger */}
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              onChange={(e) => handleFilesAdded(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="p-5 rounded-3xl bg-white hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-[#6C5DD3] text-slate-800 flex flex-col items-center justify-center gap-2 shadow-xs transition-all group min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Image className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="font-bold text-xs text-slate-900">Upload Gallery</div>
                <div className="text-[10px] text-slate-500">Pick Multiple Images</div>
              </div>
            </button>
          </div>

          {/* Checklist Requirements Status Pill */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Target Evidence Requirements
              </span>
              <span className="font-mono text-purple-600 font-bold">
                {evidenceItems.length} Captured / {requirements.length} Required
              </span>
            </div>

            <div className="space-y-2">
              {requirements.map((req, idx) => {
                const isCaptured = assignedLabels.has(req.label);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                      isCaptured
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-[#F8FAFC] border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCaptured ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className="font-medium truncate">{req.label}</span>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isCaptured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCaptured ? 'Photo Attached' : 'Missing'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uploaded Photos Gallery Preview */}
          {evidenceItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-reckless text-base font-bold text-slate-900">
                  Captured Photographs ({evidenceItems.length})
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Tap X to remove</span>
              </div>

              <div className="space-y-3">
                {evidenceItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-xs flex items-center gap-3.5 relative group"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                      <img
                        src={item.previewUrl}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Metadata & Checklist Assignment */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-purple-600">
                          Asset #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Requirement dropdown assignment */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                          Assigned Checklist Requirement:
                        </label>
                        <select
                          value={item.requirementLabel}
                          onChange={(e) => handleRequirementChange(item.id, e.target.value)}
                          className="w-full text-xs p-1.5 rounded-xl border border-slate-200 bg-[#F8FAFC] font-medium"
                        >
                          {requirements.map((req) => (
                            <option key={req.label} value={req.label}>
                              {req.label}
                            </option>
                          ))}
                          <option value="General Evidence">General Supplementary Evidence</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GPS Location Permission Banner */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-900">
                  Optional GPS Telemetry Verification
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  RealityProof checks GPS coordinates to verify that you are within the 100m site perimeter at{' '}
                  <strong className="text-slate-700">{task?.location}</strong>. GPS permission is optional and only used for site integrity confirmation.
                </p>
              </div>
            </div>

            {gpsData ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-mono text-[11px] font-bold">
                    GPS Locked: {gpsData.latitude}, {gpsData.longitude} (±{gpsData.accuracyMeters}m)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  VERIFIED
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestGps}
                disabled={isAcquiringGps}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isAcquiringGps ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Acquiring Satellite GPS Lock...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-[#6C5DD3]" />
                    <span>Attach Current GPS Coordinates</span>
                  </>
                )}
              </button>
            )}

            {gpsError && (
              <p className="text-[11px] text-amber-700 font-medium font-mono mt-1">
                {gpsError}
              </p>
            )}
          </div>

          {/* Action to proceed to review */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleProceedToReview}
              disabled={evidenceItems.length === 0 || isUploading}
              className="w-full py-4 px-5 rounded-2xl bg-[#6C5DD3] hover:bg-[#5A4CBF] disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 min-h-[52px]"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Evidence ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <span>Review & Confirm Submission</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PRE-SUBMISSION CONFIRMATION */}
      {/* ========================================================================= */}
      {submissionStep === 'review' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <h2 className="font-reckless text-2xl font-bold text-slate-900">
              Confirm Evidence Submission
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Review your checklist compliance and uploaded assets before dispatching to the AI Verification Engine.
            </p>
          </div>

          {/* Summary Audit Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-500 uppercase">Target Task ID</span>
              <span className="font-mono text-xs font-bold text-[#6C5DD3] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                {task?.taskId}
              </span>
            </div>

            {/* Checklist Completion Summary */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase">
                Requirement Compliance Checklist:
              </div>
              {requirements.map((req, idx) => {
                const isAttached = assignedLabels.has(req.label);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isAttached
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isAttached ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className="font-medium">{req.label}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold">
                      {isAttached ? 'Ready' : 'Missing'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Missing Requirements Warning if any */}
            {missingRequirements.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">
                  Notice: {missingRequirements.length} requirement(s) do not have dedicated photos attached. The AI verification engine may flag these for manual review.
                </span>
              </div>
            )}

            {/* Photos Strip Preview */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-700 uppercase">
                Uploaded Photographs ({evidenceItems.length}):
              </div>
              <div className="grid grid-cols-3 gap-2">
                {evidenceItems.map((item, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={item.previewUrl} alt="Thumb" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Telemetry Summary */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 font-medium">
              <div className="flex justify-between">
                <span>Inspector:</span>
                <strong className="text-slate-800">{currentWorker?.name} ({currentWorker?.workerId})</strong>
              </div>
              <div className="flex justify-between">
                <span>GPS Telemetry:</span>
                <span className="font-mono text-[11px] text-slate-800">
                  {gpsData ? `${gpsData.latitude}, ${gpsData.longitude}` : 'No GPS attached (Permitted)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Device Platform:</span>
                <span className="font-mono text-[11px] text-slate-800">{deviceInfo.platform}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full py-4 px-5 rounded-2xl bg-[#6C5DD3] hover:bg-[#5A4CBF] disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 min-h-[52px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting & Running AI Vision Pipeline...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Confirm & Submit Evidence</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubmissionStep('capture')}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Cancel & Modify Photographs
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SUBMISSION SUCCESS CONFIRMATION */}
      {/* ========================================================================= */}
      {submissionStep === 'success' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Submission Verified & Recorded
            </span>
            <h2 className="font-reckless text-2xl font-bold text-slate-900">
              Evidence Successfully Dispatched
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Your inspection photographs have been securely stored in the server storage system and routed to the automated AI vision pipeline.
            </p>
          </div>

          {/* Submission Details Card */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 text-xs space-y-2 text-left">
            <div className="flex justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-400">Submission ID:</span>
              <span className="font-mono font-bold text-slate-900">
                {submissionResult?.submissionId || 'SUB-CONFIRMED'}
              </span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-400">Task ID:</span>
              <span className="font-mono font-bold text-[#6C5DD3]">{task?.taskId}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-400">Updated Status:</span>
              <span className="font-mono font-bold text-purple-700">Under Review</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Escrow Payout:</span>
              <span className="font-reckless font-bold text-emerald-700">
                {typeof task?.budget === 'number' ? `$${task.budget.toFixed(2)}` : task?.budget} (Queued)
              </span>
            </div>
          </div>

          {/* AI Pipeline Result Snapshot (if available) */}
          {submissionResult?.data?.verification && (
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#6C5DD3]" />
                  AI Vision Pipeline Output
                </span>
                <span className="font-mono text-[10px] uppercase font-bold text-[#6C5DD3]">
                  {submissionResult.data.verification.recommendation}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                {submissionResult.data.verification.explanation || submissionResult.data.verification.summary}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate('/worker/submissions')}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold shadow-md shadow-purple-500/25 transition-all"
            >
              View My Submissions History
            </button>
            <button
              onClick={() => navigate('/worker')}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Return to Worker Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

