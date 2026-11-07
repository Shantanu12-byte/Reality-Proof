import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
  Smartphone
} from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

export const Topbar = ({ setIsMobileOpen }) => {
  const location = useLocation();
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
    if (path === '/' || path === '/overview') {
      return [{ label: 'Dashboard', to: '/' }, { label: 'Overview', to: '/' }];
    }
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ label: 'Dashboard', to: '/' }];
    
    const labelMap = {
      tasks: 'Tasks',
      verification: 'AI Verification',
      'live-map': 'Live Map',
      intelligence: 'Intelligence',
      payments: 'Payments',
      workers: 'Workers',
      settings: 'Settings',
      help: 'Help & Support'
    };

    parts.forEach((part, index) => {
      const url = `/${parts.slice(0, index + 1).join('/')}`;
      crumbs.push({
        label: labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1),
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

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="h-18 bg-white border-b border-[#EEF2F6] px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 select-none shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs truncate">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.to + idx}>
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
                {isLast ? (
                  <span className="font-reckless text-lg font-bold text-slate-900 truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="text-slate-400 hover:text-[#6C5DD3] font-medium transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, inspectors, zones (e.g. RP-1024)..."
            className="w-full bg-[#F6F8FC] border border-[#E9EFF6] rounded-full pl-10 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6C5DD3] focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-mono"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Backend Status Pill */}
        {isBackendConnected ? (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>MongoDB Connected</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs" title="Backend offline: serving demo fallback data">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Demo Mode</span>
          </div>
        )}

        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-600 font-medium bg-[#F6F8FC] px-3 py-1.5 rounded-full border border-[#E9EFF6]">
          <Calendar className="w-3.5 h-3.5 text-[#6C5DD3]" />
          <span>{currentDate}</span>
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2.5 rounded-xl text-slate-500 hover:text-[#6C5DD3] hover:bg-purple-50 transition-all duration-200 border border-[#EEF2F6] hover:border-purple-200"
            title="System alerts & notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#6C5DD3] ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F1F4F9]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#6C5DD3]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-[#6C5DD3] hover:text-purple-700 font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#F8FAFC]">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 text-xs cursor-pointer hover:bg-purple-50/50 transition-colors ${
                      !notif.read ? 'bg-purple-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {notif.severity === 'critical' ? (
                          <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : notif.severity === 'high' ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
                          <span className="inline-block mt-1 text-[10px] font-mono text-[#6C5DD3] font-semibold hover:underline">
                            Inspect {notif.taskId} →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-[#F1F4F9] text-center">
                <Link
                  to="/intelligence"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-slate-500 hover:text-[#6C5DD3] font-medium transition-colors inline-flex items-center gap-1"
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
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-[#EEF2F6]"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C5DD3] to-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-purple-500/20">
              SC
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                Shantanu C.
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Admin
              </div>
            </div>
          </button>

          {/* User Popover */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-[#F1F4F9]">
                <div className="text-xs font-bold text-slate-900">Shantanu C.</div>
                <div className="text-[11px] text-slate-400">director.ops@realityproof.ai</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Escrow Authorized
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:text-[#6C5DD3] hover:bg-purple-50/60 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Account & Security
                </Link>
                <Link
                  to="/payments"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:text-[#6C5DD3] hover:bg-purple-50/60 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  PayPal Escrow Status
                </Link>
              </div>

              <div className="pt-1 border-t border-[#F1F4F9]">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    alert('Session active — Enterprise SSO authenticated.');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Switch to Worker Portal Button */}
        <Link
          to="/worker"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6C5DD3] border border-purple-200/80 text-xs font-bold transition-all duration-150"
          title="Open Field Worker Mobile Portal"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Worker Portal</span>
        </Link>

        {/* Create Task Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold tracking-tight shadow-md shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Task</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
};
