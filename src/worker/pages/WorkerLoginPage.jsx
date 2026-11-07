import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useWorkerAuth } from '../auth/WorkerAuthContext';
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ChevronLeft,
  Smartphone,
  Cpu
} from 'lucide-react';

export const WorkerLoginPage = () => {
  const { login, demoWorkers, currentWorker, isAuthenticated } = useWorkerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [inputWorkerId, setInputWorkerId] = useState('');
  const [inputPassword, setInputPassword] = useState('testing123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in, redirect to worker dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/worker/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!inputWorkerId.trim()) {
      setErrorMsg('Please enter a Worker ID (e.g. WRK001, WRK002)');
      return;
    }
    if (!inputPassword.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await login(inputWorkerId.trim(), inputPassword.trim());
      navigate('/worker/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Worker authentication failed. Invalid Worker ID or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoWorker = async (wId) => {
    setInputWorkerId(wId);
    setInputPassword('testing123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 font-plus">
      {/* Top back navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors py-2 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Select Role</span>
        </Link>
        <span className="font-mono text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          FIELD INSPECTOR PORTAL
        </span>
      </div>

      {/* Main card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="stitch-card-hover bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center mx-auto shadow-2xs">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Field Inspector Login
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Sign in with your Worker ID and password to access dispatched inspection tasks, upload proof, and track escrow payouts.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Worker ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputWorkerId}
                  onChange={(e) => setInputWorkerId(e.target.value)}
                  placeholder="e.g. WRK001, WRK002, WRK003"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs font-mono font-medium transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Password
                </label>
                <span className="font-mono text-[10px] text-slate-400">
                  Demo default: <code className="text-blue-700">testing123</code>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs font-mono font-medium transition-all"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="stitch-btn-primary group relative overflow-hidden w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.98] mt-2"
            >
              <span className="stitch-shimmer"></span>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Field Inspector</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Worker Selector */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-400">Quick-Fill Demo Inspector:</span>
              <span className="font-mono text-[10px] text-slate-400">password: testing123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoWorkers.slice(0, 4).map((w) => (
                <button
                  key={w.workerId}
                  type="button"
                  onClick={() => handleSelectDemoWorker(w.workerId)}
                  className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    inputWorkerId === w.workerId
                      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-bold text-blue-700">{w.workerId}</span>
                    <span className="text-[10px] font-mono text-slate-500">{w.city}</span>
                  </div>
                  <span className="text-[11px] font-semibold truncate mt-0.5">{w.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-slate-400 font-mono py-2">
        <span>RealityProof Field Node Attestation • Enclave Identity Encrypted</span>
      </div>
    </div>
  );
};

export default WorkerLoginPage;
