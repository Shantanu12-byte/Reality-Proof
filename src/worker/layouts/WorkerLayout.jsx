import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  CheckCircle2,
  User,
  ShieldCheck,
  ChevronRight,
  LogOut,
  MapPin,
  Clock,
  Sparkles,
  Radio,
  Satellite,
  Wifi,
  Lock,
  Layers,
  Camera
} from 'lucide-react';
import { useWorkerAuth } from '../auth/WorkerAuthContext';

export const WorkerLayout = () => {
  const { currentWorker, logout } = useWorkerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentWorker) {
    return <Navigate to="/worker/login" replace />;
  }

  const navItems = [
    { label: 'Tasks', path: '/worker/dashboard', icon: ClipboardList, end: true },
    { label: 'My Queue', path: '/worker/tasks', icon: Layers },
    { label: 'Submissions', path: '/worker/submissions', icon: CheckCircle2 },
    { label: 'Profile', path: '/worker/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/worker/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col antialiased selection:bg-primary-container/20 selection:text-primary">
      {/* Topmost Hardware Enclave & Telemetry Beacon (Inverse Surface) */}
      <div className="bg-inverse-surface text-inverse-on-surface px-4 py-2 flex items-center justify-between font-mono text-[11px] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-fixed shadow-[0_0_8px_#6ffbbe]" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-wider text-inverse-on-surface">
            {currentWorker.workerId}
          </span>
          <span className="text-inverse-on-surface/50">•</span>
          <span className="text-inverse-on-surface/80 hidden xs:inline">{currentWorker.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-inverse-on-surface/10 text-inverse-on-surface/90 font-mono text-[10px] truncate max-w-[140px]">
            {currentWorker.city || 'Sector B-4 / Pune W'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden xs:flex items-center gap-1.5 text-inverse-on-surface/80 text-[10px]">
            <Satellite className="w-3.5 h-3.5 text-tertiary-fixed" />
            <span>RTK 0.38m CEP</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-inverse-on-surface/10 hover:bg-error/30 text-inverse-on-surface border border-inverse-on-surface/20 transition-all text-[11px] font-semibold cursor-pointer active:scale-95"
            title="Terminate Enclave Session"
          >
            <LogOut className="w-3.5 h-3.5 text-error-container" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Glass Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <NavLink to="/worker/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm shadow-[0_0_16px_2px_rgba(108,93,211,0.35)] group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(108,93,211,0.5)] transition-all duration-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-sans text-base font-extrabold tracking-tight text-on-surface leading-tight">
                RealityProof
              </div>
              <div className="text-[10px] text-primary font-mono font-semibold leading-none mt-0.5 uppercase tracking-wider">
                Specialist Node • {currentWorker.workerId}
              </div>
            </div>
          </NavLink>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:scale-[1.02]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Sync status & User Mini Avatar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_6px_#007e56]" />
              <span>Attested</span>
            </div>
            <NavLink
              to="/worker/profile"
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 transition-all group shadow-sm active:scale-95"
              title="Specialist Profile"
            >
              <div className="w-6 h-6 rounded-lg bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center font-mono group-hover:scale-105 transition-transform">
                {currentWorker.name ? currentWorker.name.charAt(0) : 'W'}
              </div>
              <span className="text-xs font-semibold text-on-surface hidden sm:inline group-hover:text-primary transition-colors">
                {currentWorker.name}
              </span>
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 pb-28 md:pb-8 animate-card-open">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar with Thumb Accessibility */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 px-3 py-2 shadow-[0_-4px_20px_rgba(108,93,211,0.08)]">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        isActive ? 'bg-primary-container/15 text-primary shadow-xs scale-110' : ''
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                    </div>
                    <span className="text-[10px] mt-0.5 tracking-tight font-sans">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default WorkerLayout;
