import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Building2,
  ChevronLeft,
  Cpu,
  Zap
} from 'lucide-react';

export const AdminLoginPage = () => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/admin/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both Admin username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await login(username.trim(), password.trim());
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setUsername('admin');
    setPassword('AdminPassword123!');
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
        <span className="font-mono text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
          ADMIN GATEWAY
        </span>
      </div>

      {/* Main card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="stitch-card-hover bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-950 to-blue-950 text-white flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-6 h-6 text-blue-300" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Admin Operations Portal
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Authenticate with your administrative credentials to access enterprise dispatch, intelligence, and PayPal settlement.
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
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or admin@realityproof.io"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs font-mono font-medium transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              className="stitch-btn-primary group relative overflow-hidden w-full py-3 px-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.98] mt-2"
            >
              <span className="stitch-shimmer"></span>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Authenticating Admin...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Operations Admin</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Admin Auto-fill */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-400">Demo Testing Credential</span>
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="font-mono text-blue-700 hover:underline font-bold"
              >
                Auto-fill (admin / AdminPassword123!)
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-600 flex items-center justify-between">
              <span>admin / AdminPassword123!</span>
              <span className="text-emerald-700 font-bold">● Seeded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-slate-400 font-mono py-2">
        <span>RealityProof RBAC Security Guard • Admin Privilege Enforced</span>
      </div>
    </div>
  );
};

export default AdminLoginPage;
