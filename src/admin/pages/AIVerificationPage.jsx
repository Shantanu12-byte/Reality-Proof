import React, { useState, useEffect, useCallback } from 'react';
import {
  ScanEye,
  Cpu,
  Layers,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Maximize2,
  UploadCloud,
  FileImage,
  MapPin,
  Clock,
  Camera,
  Hash,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  Check,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { verificationApi } from '../services/api';

export const AIVerificationPage = () => {
  const { tasks, refreshData, addToast } = useTaskContext();

  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterRecommendation, setFilterRecommendation] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Reviewer form state
  const [reviewerDecision, setReviewerDecision] = useState('approve');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Analyze Modal state
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [modalTaskId, setModalTaskId] = useState('');
  const [modalImageFile, setModalImageFile] = useState(null);
  const [modalImagePreview, setModalImagePreview] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState('');

  // Fetch verifications from backend
  const loadVerifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await verificationApi.getAll({
        recommendation: filterRecommendation !== 'All' ? filterRecommendation : undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      const items = res.data || (Array.isArray(res) ? res : []);
      setVerifications(items);

      if (items.length > 0) {
        setSelectedVerification((prev) => {
          if (prev) {
            const found = items.find((v) => v._id === prev._id || v.taskId === prev.taskId);
            return found || items[0];
          }
          return items[0];
        });
      } else {
        setSelectedVerification(null);
      }
    } catch (err) {
      console.error('[AIVerificationPage] Load failed:', err);
      setError(err.message || 'Failed to connect to verification backend');
    } finally {
      setIsLoading(false);
    }
  }, [filterRecommendation, searchQuery]);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  useEffect(() => {
    if (tasks.length > 0 && !modalTaskId) {
      setModalTaskId(tasks[0].taskId || tasks[0].id);
    }
  }, [tasks, modalTaskId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setModalImageFile(file);
      const url = URL.createObjectURL(file);
      setModalImagePreview(url);
      setModalImageUrl('');
    }
  };

  const handleExecuteAnalysis = async () => {
    if (!modalTaskId) {
      addToast('Missing Task ID', 'Please select a task to verify.', 'danger');
      return;
    }

    setIsAnalyzing(true);
    try {
      let res;
      if (modalImageFile) {
        res = await verificationApi.analyze(modalTaskId, { imageFile: modalImageFile });
      } else if (modalImageUrl) {
        res = await verificationApi.analyze(modalTaskId, { imageUrl: modalImageUrl });
      } else {
        res = await verificationApi.analyze(modalTaskId, {});
      }

      addToast(
        res.isMock ? 'Analysis Completed (Mock Mode)' : 'AI Vision Verification Completed',
        `Task ${modalTaskId}: Recommendation "${res.recommendation?.toUpperCase()}" with Risk Score ${res.riskScore}/100.`,
        res.recommendation === 'approve' ? 'success' : res.recommendation === 'reject' ? 'danger' : 'warn'
      );

      setIsAnalyzeModalOpen(false);
      setModalImageFile(null);
      setModalImagePreview('');
      setModalImageUrl('');

      await refreshData(true);
      await loadVerifications();

      if (res) {
        setSelectedVerification(res);
      }
    } catch (err) {
      console.error('[AIVerificationPage] Analysis failed:', err);
      addToast('Verification Failed', err.message || 'Failed to complete AI verification pipeline', 'danger');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetryVerification = async (verificationId) => {
    try {
      setIsAnalyzing(true);
      const res = await verificationApi.retry(verificationId);
      addToast('Pipeline Retried', `Re-evaluated verification for ${res.taskId}.`, 'info');
      await refreshData(true);
      await loadVerifications();
      setSelectedVerification(res);
    } catch (err) {
      addToast('Retry Failed', err.message, 'danger');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReviewSubmit = async (decision) => {
    if (!selectedVerification) return;
    setIsSubmittingReview(true);
    try {
      const res = await verificationApi.review(selectedVerification._id, {
        decision,
        notes: reviewerNotes,
        reviewerName: 'Authorized Supervisor',
      });
      addToast(
        'Human Decision Recorded',
        `Task ${res.taskId} manually updated to "${decision.toUpperCase()}". Human decision stored separately from AI report.`,
        decision === 'approve' ? 'success' : decision === 'reject' ? 'danger' : 'info'
      );
      setReviewerNotes('');
      await refreshData(true);
      await loadVerifications();
      setSelectedVerification(res);
    } catch (err) {
      addToast('Review Failed', err.message, 'danger');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const activeTask = selectedVerification
    ? tasks.find((t) => (t.taskId || t.id) === selectedVerification.taskId)
    : null;

  const isMockProvider = selectedVerification?.isMock ?? false;

  return (
    <div className="space-y-6 animate-card-open">
      {/* Precision Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              AI Verification & Forensic Triage
            </h1>
            {selectedVerification && (
              <span
                className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full border shadow-2xs ${
                  isMockProvider
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1.5'
                }`}
              >
                {!isMockProvider && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />}
                {isMockProvider
                  ? 'Dev / Mock Mode (Configure GROQ_API_KEY or GEMINI_API_KEY for live inference)'
                  : selectedVerification.modelProvider === 'groq'
                  ? `Groq AI Vision Engine (${selectedVerification.modelName || 'qwen/qwen3.8-27b'})`
                  : `Google Gemini Multimodal Vision (${selectedVerification.modelName || 'gemini-2.5-flash'})`}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Deterministic 10-step multi-modal AI vision inspection pipeline for physical task compliance, duplicate detection & risk analysis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadVerifications()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-2xs hover:shadow-xs active:rotate-180 duration-300"
            title="Refresh Verifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsAnalyzeModalOpen(true)}
            className="relative group overflow-hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 hover:from-slate-900 hover:via-blue-950 hover:to-blue-800 text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(15,23,42,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(30,64,175,0.45)] border border-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            <Zap className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Analyze New Evidence</span>
          </button>
        </div>
      </div>

      {/* 10-Step Pipeline Architecture Banner with Heavy Hover Cards */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="font-sans text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            10-Step Multi-Modal Verification Pipeline
          </h3>
          <span className="text-xs font-mono text-slate-500 font-semibold hidden sm:inline-block">
            Deterministic Engine + Groq & Gemini Vision
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 font-bold mb-1">
              <span>Step 01 - 03</span>
              <span>Input</span>
            </div>
            <div className="font-bold text-slate-900 text-xs">Evidence Ingestion</div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
              Task criteria retrieval & secure storage fetch.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 font-bold mb-1">
              <span>Step 04</span>
              <span>Metadata</span>
            </div>
            <div className="font-bold text-slate-900 text-xs">EXIF & GPS Telemetry</div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
              Image dimensions, timestamp & 100m geofence check.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 font-bold mb-1">
              <span>Step 05</span>
              <span>Fingerprint</span>
            </div>
            <div className="font-bold text-slate-900 text-xs">SHA-256 & pHash</div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
              Hamming distance comparison across historic uploads.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 font-bold mb-1">
              <span>Step 06 - 07</span>
              <span>Vision AI</span>
            </div>
            <div className="font-bold text-slate-900 text-xs">Gemini / Groq Inference</div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
              Object counts, checklist observations & quality audit.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 font-bold mb-1">
              <span>Step 08 - 10</span>
              <span>Outcome</span>
            </div>
            <div className="font-bold text-slate-900 text-xs">Deterministic Risk Score</div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
              Risk score (0-100), transparent factors & task status.
            </p>
          </div>
        </div>
      </div>

      {/* Main Analysis & Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Verification History Selector (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans text-base font-extrabold text-slate-900">
                Inspection Runs ({verifications.length})
              </h3>
              <div className="text-xs text-slate-400 font-mono">Live MongoDB</div>
            </div>

            {/* Filter and Search */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Task ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {['All', 'approve', 'manual_review', 'reject'].map((rec) => (
                  <button
                    key={rec}
                    onClick={() => setFilterRecommendation(rec)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                      filterRecommendation === rec
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {rec === 'All' ? 'All' : rec.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Items List */}
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-blue-600" />
                Loading verification records...
              </div>
            ) : verifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <FileImage className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No verifications found</p>
                <p className="text-[11px] mt-1">Upload evidence or run an analysis to generate an inspection report.</p>
                <button
                  onClick={() => setIsAnalyzeModalOpen(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-900 text-white text-xs font-bold transition-all"
                >
                  Analyze Task
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {verifications.map((v) => {
                  const isSelected = selectedVerification?._id === v._id;
                  const score = v.riskScore ?? 0;
                  return (
                    <div
                      key={v._id}
                      onClick={() => setSelectedVerification(v)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-xs ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-600 shadow-sm ring-1 ring-blue-500/20 border-l-4 border-l-blue-600'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-white hover:border-blue-300 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">{v.taskId}</span>
                          {v.isMock && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              MOCK
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            v.recommendation === 'approve'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : v.recommendation === 'reject'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {v.recommendation?.toUpperCase() || 'REVIEW'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 line-clamp-1 mb-2 font-medium">
                        {v.summary || v.explanation}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-200/60">
                        <span>Risk: <strong className={score > 50 ? 'text-rose-600' : 'text-slate-800'}>{score}/100</strong></span>
                        <span>{new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Evidence Inspection Interface (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedVerification ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <ScanEye className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Verification Selected</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Select an inspection run from the list on the left, or click "Analyze New Evidence" to process field photos with the multimodal vision model.
              </p>
            </div>
          ) : (
            <>
              {/* Evidence Overview & Recommendation Header Card */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {selectedVerification.taskId}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                          selectedVerification.overallAssessment === 'pass'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedVerification.overallAssessment === 'fail'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        ASSESSMENT: {selectedVerification.overallAssessment?.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                          selectedVerification.humanReview?.decision === 'rejected'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : selectedVerification.riskCategory === 'low'
                            ? 'bg-emerald-50 text-emerald-700'
                            : selectedVerification.riskCategory === 'critical' || selectedVerification.riskCategory === 'high'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {selectedVerification.humanReview?.decision === 'rejected'
                          ? 'FLAG RESOLVED: REJECTED'
                          : `RISK: ${selectedVerification.riskCategory?.toUpperCase()}`}
                      </span>
                    </div>
                    <h2 className="font-sans text-xl sm:text-2xl font-extrabold text-slate-900">
                      {activeTask?.title || activeTask?.name || `Task ${selectedVerification.taskId}`}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRetryVerification(selectedVerification._id)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>Re-analyze</span>
                    </button>
                  </div>
                </div>

                {/* Explanation / Summary Banner */}
                <div
                  className={`p-4 rounded-xl border ${
                    selectedVerification.recommendation === 'approve'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : selectedVerification.recommendation === 'reject'
                      ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {selectedVerification.recommendation === 'approve' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : selectedVerification.recommendation === 'reject' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider mb-0.5">
                        Recommendation: {selectedVerification.recommendation?.replace('_', ' ').toUpperCase()}
                      </div>
                      <p className="text-xs font-medium leading-relaxed">
                        {selectedVerification.explanation || selectedVerification.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk Score Gauge & Factors */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Deterministic Risk Score
                    </span>
                    <span className="font-sans text-xl font-extrabold text-slate-900">
                      {selectedVerification.riskScore} / 100
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedVerification.riskScore < 25
                          ? 'bg-emerald-500'
                          : selectedVerification.riskScore < 55
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(selectedVerification.riskScore, 5)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-3">
                    <span>Low Risk (0 - 24)</span>
                    <span>Medium Risk (25 - 54)</span>
                    <span>High Risk (55 - 79)</span>
                    <span className="text-rose-600 font-bold">Critical (80+)</span>
                  </div>

                  {/* Contributing Reasons */}
                  {selectedVerification.riskReasons && selectedVerification.riskReasons.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/70 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contributing Risk Factors:
                      </div>
                      {selectedVerification.riskReasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between text-xs p-2 rounded-lg bg-white border border-slate-200"
                        >
                          <span className="text-slate-700 font-medium">{reason.description}</span>
                          <span className="font-mono font-bold text-rose-600 shrink-0 ml-2">
                            +{reason.scoreImpact} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Two Column Layout: Evidence Image & Metadata VS AI Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Evidence & EXIF Inspector */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 transition-all duration-300 hover:border-blue-500/40">
                    <h4 className="font-sans text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      Submitted Photographic Asset
                    </h4>

                    {/* Image Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center group shadow-xs">
                      {selectedVerification.evidenceThumbnails?.[0] || selectedVerification.evidenceIds?.[0] ? (
                        <img
                          src={selectedVerification.evidenceThumbnails?.[0] || selectedVerification.evidenceIds?.[0]}
                          alt="Submitted Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-slate-400 text-xs flex flex-col items-center">
                          <FileImage className="w-8 h-8 mb-1" />
                          <span>Raw image buffer analyzed</span>
                        </div>
                      )}
                    </div>

                    {/* Extracted Metadata Grid */}
                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider font-mono">
                        Hardware & File Telemetry
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px]">MIME Format</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedVerification.metadataFindings?.fileType || 'image/jpeg'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px]">Dimensions</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedVerification.metadataFindings?.dimensions?.width
                              ? `${selectedVerification.metadataFindings.dimensions.width} × ${selectedVerification.metadataFindings.dimensions.height} px`
                              : 'Standard'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px]">EXIF Timestamp</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedVerification.metadataFindings?.exifTimestamp
                              ? new Date(selectedVerification.metadataFindings.exifTimestamp).toLocaleString()
                              : 'Not embedded'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px]">Geo-Fence Status</span>
                          <span
                            className={`font-mono font-bold ${
                              selectedVerification.metadataFindings?.geoFenceStatus === 'match'
                                ? 'text-emerald-600'
                                : selectedVerification.metadataFindings?.geoFenceStatus === 'breach'
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {selectedVerification.metadataFindings?.geoFenceStatus === 'match'
                              ? 'Within 100m'
                              : selectedVerification.metadataFindings?.geoFenceStatus === 'breach'
                              ? `Breached (${selectedVerification.metadataFindings.distanceMeters}m)`
                              : 'No GPS (Permitted)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Duplicate Fingerprint Card */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-blue-600" />
                          Fingerprint & Duplicate Check
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            selectedVerification.duplicateMatches?.exactMatchFound
                              ? 'bg-rose-100 text-rose-800'
                              : selectedVerification.duplicateMatches?.perceptualMatchFound
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {selectedVerification.duplicateMatches?.exactMatchFound
                            ? 'EXACT MATCH FOUND'
                            : selectedVerification.duplicateMatches?.perceptualMatchFound
                            ? 'SIMILAR IMAGE'
                            : 'NO DUPLICATES'}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[10px] text-slate-600 break-all">
                        <div>
                          <span className="text-slate-400">SHA-256: </span>
                          <span>{selectedVerification.duplicateMatches?.sha256?.substring(0, 24)}...</span>
                        </div>
                        <div>
                          <span className="text-slate-400">pHash: </span>
                          <span>{selectedVerification.duplicateMatches?.pHash || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Matched tasks if any */}
                      {selectedVerification.duplicateMatches?.matches?.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-700">Matched Historical Tasks:</span>
                          {selectedVerification.duplicateMatches.matches.slice(0, 3).map((m, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-slate-700 font-mono">{m.matchedTaskId}</span>
                              <span className="font-semibold text-amber-700">
                                {m.matchType === 'exact' ? '100% Exact' : `${m.similarity}% similarity (dist ${m.hammingDistance})`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Human Reviewer Override Console */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 transition-all duration-300 hover:border-blue-500/40">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="font-sans text-sm font-extrabold text-slate-900">
                        Human Reviewer Override
                      </h4>
                      {selectedVerification.humanReview?.reviewed && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          DECISION RECORDED
                        </span>
                      )}
                    </div>

                    {selectedVerification.humanReview?.reviewed ? (
                      <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Decision: {selectedVerification.humanReview.decision?.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-blue-700">
                            {new Date(selectedVerification.humanReview.reviewedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-700">
                          <span className="text-slate-400">Reviewer: </span>
                          <strong className="text-slate-800">{selectedVerification.humanReview.reviewer}</strong>
                        </div>
                        {selectedVerification.humanReview.notes && (
                          <div className="text-slate-600 italic mt-1 font-mono text-[11px]">
                            "{selectedVerification.humanReview.notes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">
                        Human supervisors can override the automated AI recommendation. Decisions are stored distinctly for compliance audit trails.
                      </p>
                    )}

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block uppercase font-mono">
                        Reviewer Directive / Notes:
                      </label>
                      <textarea
                        rows={2}
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                        placeholder="Add inspection notes or specify required re-capture angles..."
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => handleReviewSubmit('approve')}
                        disabled={isSubmittingReview}
                        className="px-2.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-[0_4px_12px_rgba(5,150,105,0.3)] transition-all flex items-center justify-center gap-1 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleReviewSubmit('request_evidence')}
                        disabled={isSubmittingReview}
                        className="px-2.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-capture</span>
                      </button>

                      <button
                        onClick={() => handleReviewSubmit('reject')}
                        disabled={isSubmittingReview}
                        className="px-2.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-[0_4px_12px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-1 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Inspection Checklist & Objects */}
                <div className="space-y-4">
                  {/* Requirements Checklist */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 transition-all duration-300 hover:border-blue-500/40">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="font-sans text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        AI Requirement Checklist
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">
                        {selectedVerification.requirementResults?.filter((r) => r.result === 'pass').length} /{' '}
                        {selectedVerification.requirementResults?.length || 0} Met
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedVerification.requirementResults?.map((req, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs transition-all ${
                            req.result === 'pass'
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : req.result === 'fail'
                              ? 'bg-rose-50/50 border-rose-300'
                              : 'bg-amber-50/40 border-amber-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-900">{req.requirement}</span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                req.result === 'pass'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.result === 'fail'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.result?.toUpperCase()}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                            {req.observation || 'Observed by multimodal model during inference.'}
                          </p>

                          <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>Confidence: <strong>{Math.round((req.confidence || 0.9) * 100)}%</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detected Objects Matrix */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3 transition-all duration-300 hover:border-blue-500/40">
                    <h4 className="font-sans text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Detected Physical Objects
                    </h4>

                    {selectedVerification.detectedObjects?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedVerification.detectedObjects.map((obj, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between text-xs hover:border-blue-300 transition-colors"
                          >
                            <span className="font-bold text-slate-800 truncate">{obj.object}</span>
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
                              <span>Count: <strong className="text-slate-900">{obj.count}</strong></span>
                              <span className="text-emerald-700 font-bold">{Math.round((obj.confidence || 0.9) * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">No discrete objects classified.</p>
                    )}
                  </div>

                  {/* Image Quality Findings */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3 transition-all duration-300 hover:border-blue-500/40">
                    <h4 className="font-sans text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Image Quality Assessment
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Blurry</span>
                        <span className={`font-mono font-bold ${selectedVerification.imageQuality?.isBlurry ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedVerification.imageQuality?.isBlurry ? 'YES (Deficient)' : 'NO (Clear)'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Lighting</span>
                        <span className={`font-mono font-bold ${selectedVerification.imageQuality?.isTooDark ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedVerification.imageQuality?.isTooDark ? 'TOO DARK' : 'ADEQUATE'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Obstructed</span>
                        <span className={`font-mono font-bold ${selectedVerification.imageQuality?.isObstructed ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedVerification.imageQuality?.isObstructed ? 'YES' : 'NONE'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Quality</span>
                        <span className="font-mono font-bold uppercase text-emerald-700">
                          {selectedVerification.imageQuality?.qualityAssessment || 'GOOD'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Analyze New Evidence */}
      {isAnalyzeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 stitch-modal-open">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-sans text-xl font-extrabold text-slate-900">
                  Analyze Evidence with AI Vision
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Upload an image to run through the 10-step multi-modal verification pipeline.
                </p>
              </div>
              <button
                onClick={() => setIsAnalyzeModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Task to Verify</label>
              <select
                value={modalTaskId}
                onChange={(e) => setModalTaskId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
              >
                {tasks.map((t) => (
                  <option key={t.taskId || t.id} value={t.taskId || t.id}>
                    {t.taskId || t.id} — {t.title || t.name} ({t.location})
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Upload Photographic Evidence</label>
                <button
                  type="button"
                  onClick={() => {
                    const sampleUrl = '/uploads/evidence/field-evidence-1793993161984-337830639.jpg';
                    setModalImageUrl(sampleUrl);
                    setModalImagePreview(sampleUrl);
                    setModalImageFile(null);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Use Sample Photo
                </button>
              </div>
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {modalImagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={modalImagePreview}
                      alt="Upload Preview"
                      className="max-h-36 mx-auto rounded-xl object-contain border border-slate-200 shadow-2xs"
                    />
                    <p className="text-xs font-bold text-slate-800">{modalImageFile?.name}</p>
                    <span className="text-[11px] text-blue-600 font-medium hover:underline">
                      Click to choose a different photo
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-blue-600 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Click or drag & drop inspection photo</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 15MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAnalyzeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAnalysis}
                disabled={isAnalyzing}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-900 text-white text-xs font-bold shadow-md shadow-slate-900/20 flex items-center gap-2 hover:-translate-y-0.5 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span>Run Verification Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
