import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  MapPin,
  Cpu,
  CreditCard,
  UserCheck,
  Check,
  Server,
  Zap,
  Radio
} from 'lucide-react';
import { useAdminAuth } from '../../admin/auth/AdminAuthContext';
import { useWorkerAuth } from '../../worker/auth/WorkerAuthContext';

export const RoleSelectionLandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated: isAdminAuth, currentAdmin } = useAdminAuth();
  const { isAuthenticated: isWorkerAuth, currentWorker } = useWorkerAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-plus flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Telemetry Header */}
      <header className="w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/90 px-6 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-center shadow-md font-mono font-bold text-sm border border-slate-800">
              RP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-plus text-base font-bold text-slate-900 tracking-tight leading-none block">
                  RealityProof
                </span>
                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  v4.8
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Precision Intelligence &amp; Multi-Modal Attestation Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CLUSTER ATLAS SYNC (18ms)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-6 py-12 md:py-16 my-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3.5 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-mono tracking-wide uppercase border border-blue-200/80 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            Zero-Trust Physical Attestation Engine
          </div>
          <h1 className="font-plus text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Select Operational Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            RealityProof enforces cryptographic isolation between the Enterprise Operations Console and the Field Inspector Hardware Portal with strict role-based access control.
          </p>
        </div>

        {/* Two Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card 1: Admin Operations */}
          <div className="stitch-card-hover bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-950 to-blue-950 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
                  <LayoutDashboard className="w-6 h-6 text-blue-300" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  COMMAND OPS
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="font-plus text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Operations Admin Console
                </h2>
                <p className="font-plus text-xs text-slate-500 leading-relaxed">
                  Enterprise operations hub. Dispatch tasks, inspect vision verifications, audit fraud vectors, review telemetry, and capture PayPal escrow settlements.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Security Capabilities
                </div>
                <ul className="font-plus text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Real-time GPS geo-fence perimeter tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Groq Vision multi-modal verification suite</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>PayPal Sandbox dual-stage escrow capture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Two-step verified quarantine &amp; deletion gate</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => navigate('/admin/login')}
                className="stitch-btn-primary group/btn relative overflow-hidden w-full py-3 px-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white text-xs font-bold font-plus shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="stitch-shimmer"></span>
                <span>Enter Admin Console</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Field Inspector Portal */}
          <div className="stitch-card-hover bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform duration-300">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  FIELD CADRE
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="font-plus text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Field Inspector Hub
                </h2>
                <p className="font-plus text-xs text-slate-500 leading-relaxed">
                  Mobile-first specialist terminal. Review assigned locations, capture cryptographic photographic proof, verify GPS locks, and receive instant settlements.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Field Verification Features
                </div>
                <ul className="font-plus text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Hardware TPM 2.0 &amp; RTK GNSS attestation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Multi-angle requirement checklists</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Anti-tamper EXIF metadata capture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Instant PayPal worker balance disbursement</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => navigate('/worker/login')}
                className="stitch-btn-primary group/btn relative overflow-hidden w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold font-plus shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="stitch-shimmer"></span>
                <span>Enter Inspector Portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/90 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} RealityProof Network. Dual-Role Zero-Trust Architecture.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-700 font-semibold">● SECURE TLS 1.3</span>
            <span>● MONGO CLUSTER SYNCHRONIZED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RoleSelectionLandingPage;
