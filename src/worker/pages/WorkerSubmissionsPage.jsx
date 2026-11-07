import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileText,
  MapPin,
  RefreshCw,
  Camera,
  Layers,
  Eye,
  Info
} from 'lucide-react';
import { workerApi } from '../services/workerApi';
import { useWorkerAuth } from '../auth/WorkerAuthContext';

export const WorkerSubmissionsPage = () => {
  const { currentWorker } = useWorkerAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await workerApi.getSubmissions();
      const list = res.data || (Array.isArray(res) ? res : []);
      setSubmissions(list);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setError('Unable to load submission history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [currentWorker]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (submission) => {
    const assessment = submission.overallAssessment || 'pending';
    const recommendation = submission.recommendation || '';

    if (assessment === 'pass' || recommendation === 'approve') {
      return {
        label: 'Verified • Passed',
        bg: 'bg-tertiary/10 text-tertiary border-tertiary/30',
        icon: CheckCircle2,
        dotColor: 'bg-tertiary',
      };
    }
    if (assessment === 'fail' || recommendation === 'reject') {
      return {
        label: 'Verification Failed',
        bg: 'bg-error-container text-error border-error/20',
        icon: XCircle,
        dotColor: 'bg-error',
      };
    }
    if (assessment === 'uncertain' || recommendation === 'manual_review') {
      return {
        label: 'Under Review',
        bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
        icon: AlertTriangle,
        dotColor: 'bg-amber-500',
      };
    }
    return {
      label: 'Analyzing Evidence',
      bg: 'bg-primary-fixed/40 text-primary border-primary/20',
      icon: Clock,
      dotColor: 'bg-primary',
    };
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedFilter === 'All') return true;
    const assessment = sub.overallAssessment || '';
    const rec = sub.recommendation || '';
    if (selectedFilter === 'Verified') {
      return assessment === 'pass' || rec === 'approve';
    }
    if (selectedFilter === 'Under Review') {
      return assessment === 'uncertain' || rec === 'manual_review' || (!assessment && !rec);
    }
    if (selectedFilter === 'Action Required') {
      return assessment === 'fail' || rec === 'reject' || (sub.missingEvidence && sub.missingEvidence.length > 0);
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12 animate-card-open">
      {/* Top Header Card */}
      <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-sans text-on-surface">
              Submission Ledger & Attestations
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Immutable cryptographically-logged proofs, AI vision validation, and escrow releases.
            </p>
          </div>
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="p-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Verified', 'Under Review', 'Action Required'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === tab
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="bg-surface-container-lowest rounded-xl p-10 border border-outline-variant/30 text-center space-y-3 shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-on-surface-variant font-medium">Querying distributed proof ledger...</p>
        </div>
      ) : error ? (
        <div className="bg-error-container rounded-xl p-5 border border-error/20 text-center space-y-2 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-error mx-auto" />
          <p className="text-xs text-on-error-container font-medium">{error}</p>
          <button
            onClick={fetchSubmissions}
            className="px-3.5 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold hover:bg-error/90 transition-colors cursor-pointer active:scale-95"
          >
            Retry Attestation Sync
          </button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-10 border border-outline-variant/30 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center mx-auto border border-outline-variant/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-on-surface">No Submissions Found</h3>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
            {selectedFilter === 'All'
              ? 'You have not submitted evidence for any assigned tasks yet.'
              : `No submissions matching "${selectedFilter}".`}
          </p>
          <Link
            to="/worker/tasks"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:shadow-[0_8px_20px_-4px_rgba(108,93,211,0.45)] hover:-translate-y-0.5 transition-all"
          >
            <span>Open Assigned Tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const isExpanded = expandedId === sub._id;
            const badge = getStatusBadge(sub);
            const BadgeIcon = badge.icon;
            const submissionDate = sub.createdAt
              ? new Date(sub.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently submitted';

            return (
              <div
                key={sub._id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden hover:border-primary/40 hover:shadow-[0px_12px_32px_-4px_rgba(108,93,211,0.12)] transition-all duration-300"
              >
                {/* Header card area */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded-full border border-primary/20">
                          {sub.taskId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor} shadow-[0_0_6px_currentColor]`} />
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-on-surface mt-2 truncate">
                        {sub.task?.title || `Task Verification — ${sub.taskId}`}
                      </h2>
                      <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-on-surface-variant/60" />
                          <span>{submissionDate}</span>
                        </span>
                        {sub.task?.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-on-surface-variant/60" />
                            <span className="truncate">{sub.task.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(sub._id)}
                      className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0 cursor-pointer active:scale-95"
                      aria-label="Expand details"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* AI Summary Banner */}
                  {sub.explanation && (
                    <div className="mt-3.5 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-bold text-on-surface text-[11px] uppercase tracking-wider">
                          Cryptographic Vision Verification Finding
                        </div>
                        <p className="mt-0.5 leading-relaxed text-on-surface-variant">
                          {sub.explanation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Metrics Bar */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 pt-3 border-t border-outline-variant/20 text-center font-mono text-[11px]">
                    <div className="bg-surface-container-low p-2 rounded-lg border border-outline-variant/20">
                      <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                        Risk Score
                      </div>
                      <div className={`text-xs font-bold mt-0.5 ${
                        sub.riskScore > 50 ? 'text-error' : sub.riskScore > 20 ? 'text-amber-600' : 'text-tertiary'
                      }`}>
                        {sub.riskScore !== undefined ? `${sub.riskScore}/100` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg border border-outline-variant/20">
                      <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                        Risk Tier
                      </div>
                      <div className="text-xs font-bold text-on-surface mt-0.5 capitalize">
                        {sub.riskCategory || 'Low'}
                      </div>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg border border-outline-variant/20">
                      <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                        AI Vision
                      </div>
                      <div className="text-xs font-bold text-primary mt-0.5 truncate">
                        {sub.modelProvider || 'Groq Vision'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Report */}
                {isExpanded && (
                  <div className="bg-surface-container p-4 sm:p-5 border-t border-outline-variant/30 space-y-4 text-xs animate-in fade-in duration-200">
                    {/* Requirements Analysis Checklist */}
                    {sub.requirementResults && sub.requirementResults.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-bold text-on-surface text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span>Task Attestation Requirements</span>
                        </div>
                        <div className="space-y-1.5">
                          {sub.requirementResults.map((req, idx) => (
                            <div
                              key={idx}
                              className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/20 flex items-start justify-between gap-3 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-on-surface">
                                  {req.requirement}
                                </div>
                                {req.observation && (
                                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                                    {req.observation}
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0">
                                {req.result === 'pass' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-md border border-tertiary/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Pass</span>
                                  </span>
                                ) : req.result === 'fail' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-error bg-error-container px-2 py-0.5 rounded-md border border-error/20">
                                    <XCircle className="w-3 h-3" />
                                    <span>Fail</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Uncertain</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Quality and Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Quality */}
                      <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20 shadow-2xs">
                        <div className="font-bold text-on-surface text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-secondary" />
                          <span>Sensor & Image Fidelity</span>
                        </div>
                        <div className="space-y-1 text-[11px] text-on-surface-variant">
                          <div className="flex justify-between">
                            <span>Quality Rating:</span>
                            <span className="font-semibold text-on-surface capitalize">
                              {sub.imageQuality?.qualityAssessment || 'Good'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Motion Blur:</span>
                            <span className={sub.imageQuality?.isBlurry ? 'text-error font-semibold' : 'text-tertiary font-medium'}>
                              {sub.imageQuality?.isBlurry ? 'Detected' : 'None'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Illumination:</span>
                            <span className={sub.imageQuality?.isTooDark ? 'text-error font-semibold' : 'text-tertiary font-medium'}>
                              {sub.imageQuality?.isTooDark ? 'Sub-optimal' : 'Calibrated'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Duplicate & Anti-Fraud */}
                      <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20 shadow-2xs">
                        <div className="font-bold text-on-surface text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
                          <span>Cryptographic Collision Checks</span>
                        </div>
                        <div className="space-y-1 text-[11px] text-on-surface-variant">
                          <div className="flex justify-between">
                            <span>SHA-256 Exact Collision:</span>
                            <span className={sub.duplicateMatches?.hasExactMatch ? 'text-error font-bold' : 'text-tertiary font-medium'}>
                              {sub.duplicateMatches?.hasExactMatch ? 'Collision Flagged' : 'Unique (0 Collision)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>pHash Perceptual:</span>
                            <span className={sub.duplicateMatches?.hasPerceptualMatch ? 'text-amber-600 font-semibold' : 'text-tertiary font-medium'}>
                              {sub.duplicateMatches?.hasPerceptualMatch ? 'Variance Detected' : 'Authentic Hash'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>RTK GNSS Geofence:</span>
                            <span className="text-on-surface font-medium">
                              {sub.metadataFindings?.locationStatus || 'Attested at Node Checkpoint'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Link
                        to={`/worker/tasks/${sub.taskId}`}
                        className="flex-1 py-2 px-3 text-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg font-bold text-on-surface hover:bg-surface-container transition-colors text-xs active:scale-95 shadow-2xs"
                      >
                        Inspect Original Task
                      </Link>
                      {(sub.recommendation === 'reject' || sub.recommendation === 'manual_review') && (
                        <Link
                          to={`/worker/tasks/${sub.taskId}/submit`}
                          className="flex-1 py-2 px-3 text-center bg-primary text-on-primary rounded-lg font-bold hover:bg-primary-container transition-all text-xs shadow-sm active:scale-95 hover:shadow-[0_8px_20px_-4px_rgba(108,93,211,0.45)]"
                        >
                          Submit Remediation Photo
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkerSubmissionsPage;
