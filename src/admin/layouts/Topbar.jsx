import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  Calendar,
  ChevronRight,
  Menu,
  CheckCircle,
  AlertTriangle,
  Shield,
  User,
  LogOut,
  ExternalLink,
  Sparkles,
  Command,
  Activity,
  Zap
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { useAdminAuth } from '../auth/AdminAuthContext';

export const Topbar = ({ setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentAdmin, logout } = useAdminAuth();
  const {
    setIsCreateModalOpen,
    searchQuery,
    setSearchQuery,
    notifications,
    markAllNotificationsRead,
    setActiveTaskForDetail,
    tasks,
    isBackendConnected
  } = useTaskContext();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/dashboard' || path === '/' || path === '/overview') {
      return [{ label: 'OPERATIONS', to: '/admin/dashboard' }, { label: 'DASHBOARD', to: '/admin/dashboard' }];
    }
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ label: 'OPERATIONS', to: '/admin/dashboard' }];
    
    const labelMap = {
      dashboard: 'DASHBOARD',
      tasks: 'TASK DISPATCH',
      verification: 'VERIFICATION TRIAGE',
      map: 'LIVE TELEMETRY',
      'live-map': 'LIVE TELEMETRY',
      intelligence: 'CRITICAL FLAGS',
      payments: 'ESCROW VAULT',
      workers: 'FIELD SPECIALISTS',
      settings: 'SYSTEM POLICIES',
      help: 'AUDIT PROTOCOLS'
    };

    parts.forEach((part, index) => {
      if (part === 'admin' && index === 0) return;
      const url = `/${parts.slice(0, index + 1).join('/')}`;
      crumbs.push({
        label: labelMap[part] || part.toUpperCase(),
        to: url
      });
    });
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notif) => {
    setIsNotifOpen(false);
    if (notif.taskId) {
      const targetTask = tasks.find((t) => t.id === notif.taskId);
      if (targetTask) {
        setActiveTaskForDetail(targetTask);
      }
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 select-none shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
      {/* Left: Mobile hamburger & Precision Breadcrumbs */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Telemetry Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-400 tracking-wider truncate">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.to + idx}>
                {idx > 0 && (
                  <span className="text-slate-300">/</span>
                )}
                {isLast ? (
                  <span className="font-sans text-sm font-extrabold text-slate-900 tracking-tight truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="hover:text-blue-600 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Cluster Node Chip */}
        <span className="hidden xl:inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200/80 font-mono text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_6px_rgba(37,99,235,0.7)]" />
          PROD-CLUSTER-A
        </span>
      </div>

      {/* Center: Search input with ⌘K Badge */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search telemetry, proof hash, inspector or zone..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-xl pl-10 pr-14 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-white border border-slate-200 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded shadow-2xs font-semibold">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Backend & Synced Latency Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full font-mono text-[11px] shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-slate-500 font-medium">LATENCY <strong className="text-slate-900 font-bold">18ms</strong></span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-medium">SYNC <strong className="text-slate-900 font-bold">99.98%</strong></span>
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all duration-200 border border-slate-200/80 hover:border-blue-300"
            title="System alerts & notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.7)] ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Incident & Audit Stream</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 text-xs cursor-pointer hover:bg-blue-50/50 transition-colors ${
                      !notif.read ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {notif.severity === 'critical' ? (
                          <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : notif.severity === 'high' ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-800 truncate text-xs">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {notif.time}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        {notif.taskId && (
                          <span className="inline-block mt-1 text-[10px] font-mono text-blue-600 font-semibold hover:underline">
                            Inspect {notif.taskId} →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 text-center">
                <Link
                  to="/admin/intelligence"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition-colors inline-flex items-center gap-1"
                >
                  View intelligence security audit <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-sm border border-slate-700 group-hover:border-blue-500 transition-colors">
              {currentAdmin?.avatar || (currentAdmin?.name ? currentAdmin.name.slice(0, 2).toUpperCase() : 'AD')}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                {currentAdmin?.name || 'Sr. Lead Auditor'}
              </div>
              <div className="text-[10px] text-blue-600 font-mono font-semibold">
                AdminOps
              </div>
            </div>
          </button>

          {/* User Popover */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentAdmin?.name || 'Sr. Lead Auditor'}</div>
                <div className="text-[11px] text-slate-400 font-mono">{currentAdmin?.email || 'admin@realityproof.ai'}</div>
                <div className="mt-2 flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                  Full Operational Authority
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/admin/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Account Security
                </Link>
                <Link
                  to="/admin/payments"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Escrow Settlement Vault
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                    navigate('/admin/login', { replace: true });
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button: Create Task Dispatch (Stitch Gradient + Heavy Shimmer Hover) */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="relative group overflow-hidden flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 hover:from-slate-900 hover:via-blue-950 hover:to-blue-800 text-white font-sans text-xs font-bold shadow-[0_8px_20px_-4px_rgba(15,23,42,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(30,64,175,0.45)] border border-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
        >
          {/* Shimmer sweep effect */}
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
          <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-90 transition-transform duration-300" />
          <span className="hidden sm:inline tracking-wide">Create Task Dispatch</span>
          <span className="sm:hidden">Dispatch</span>
        </button>
      </div>
    </header>
  );
};
