import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  CheckSquare,
  ScanEye,
  MapPin,
  BrainCircuit,
  CreditCard,
  Users,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Building2,
  X,
  Sparkles,
  Radio,
  Cpu
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { useAdminAuth } from '../auth/AdminAuthContext';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { tasks, workers } = useTaskContext();
  const { currentAdmin } = useAdminAuth();
  const location = useLocation();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('RealityProof Operations');

  const workspaces = [
    { name: 'RealityProof Operations', env: 'Production Node', region: 'IN-WEST' },
    { name: 'India Logistics Hub', env: 'Sub-Zone Ops', region: 'IN-MAH' },
    { name: 'Enterprise Staging', env: 'Sandbox v3', region: 'GLOBAL' }
  ];

  // Dynamically computed navigation badge values: if a critical task is rejected, it is removed from the flag
  const flaggedCount = tasks.filter(
    (t) =>
      (t.aiResult || t.verificationStatus) === 'Failed' &&
      t.status !== 'Rejected' &&
      t.verificationStatus !== 'Rejected'
  ).length;
  const pendingPaymentSum = tasks
    .filter((t) => t.paymentStatus === 'Pending')
    .reduce((sum, t) => {
      const val = typeof t.budget === 'number' ? t.budget : (parseFloat(String(t.budget).replace(/[^0-9.]/g, '')) || 0);
      return sum + val;
    }, 0);
  const activeWorkersCount = (workers || []).filter((w) => w.status === 'Active' || !w.status).length;

  const mainNavItems = [
    { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/tasks', label: 'Task Dispatch', icon: CheckSquare, badge: tasks.length.toString() },
    { path: '/admin/verification', label: 'Verification Triage', icon: ScanEye, badge: 'Live', badgeGlow: true },
    { path: '/admin/map', label: 'Live Telemetry', icon: MapPin },
    {
      path: '/admin/intelligence',
      label: 'Critical Flags',
      icon: BrainCircuit,
      badge: `${flaggedCount}`,
      badgeColor: flaggedCount > 0 ? 'rose' : 'blue',
    },
    {
      path: '/admin/payments',
      label: 'Escrow Vault',
      icon: CreditCard,
      badge: `$${Math.round(pendingPaymentSum)}`,
    },
    {
      path: '/admin/workers',
      label: 'Field Specialists',
      icon: Users,
      badge: `${activeWorkersCount}`,
    },
  ];

  const bottomNavItems = [
    { path: '/admin/settings', label: 'System Policies', icon: Settings },
    { path: '/admin/help', label: 'Audit Protocols', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 ease-in-out select-none shadow-[4px_0_24px_rgba(15,23,42,0.03)] ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 flex items-center justify-between px-4 sm:px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_4px_12px_rgba(15,23,42,0.25)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-sans font-extrabold text-lg tracking-tight text-slate-900">
                    RealityProof
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                    v4.8
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <span>Auditor Engine Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Close for mobile drawer */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Selector */}
        {!isCollapsed ? (
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/60 text-left border border-slate-200/80 text-xs transition-all duration-200 group hover:border-blue-300"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-slate-900 font-bold truncate text-xs">
                    {selectedWorkspace}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Node: IN-WEST-PROD
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 group-hover:text-blue-600 transition-colors" />
            </button>

            {/* Workspace Dropdown */}
            {workspaceMenuOpen && (
              <div className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Cluster Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.name}
                    onClick={() => {
                      setSelectedWorkspace(ws.name);
                      setWorkspaceMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors"
                  >
                    <div>
                      <div className="text-slate-800 font-semibold">{ws.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ws.env} • {ws.region}</div>
                    </div>
                    {selectedWorkspace === ws.name && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 border-b border-slate-100 flex justify-center">
            <div
              title={selectedWorkspace}
              className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-200 text-blue-700 hover:scale-105 transition-transform"
            >
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
              Operations Hub
            </div>
          )}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/' || location.pathname === '/overview'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white shadow-[0_4px_14px_rgba(15,23,42,0.25)] border border-blue-900/40 hover:shadow-md hover:border-blue-500/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:translate-x-1'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-600'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-bold border transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-blue-500/25 border-blue-400/40 text-blue-200'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                        : 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Cluster Proof Sync Widget & User Profile Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2">
          {!isCollapsed && (
            <div className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex flex-col gap-1.5 transition-all duration-300 hover:shadow-sm hover:border-blue-400/40 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Cluster Proof Sync
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)] animate-pulse" />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>Epoch #94,812</span>
                <span className="text-emerald-700 font-bold">100% Attested</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 h-full w-full" />
              </div>
              <p className="font-mono text-[9px] text-slate-400 truncate">Hash: 0x6C5D...E8FF92A</p>
            </div>
          )}

          {/* User Profile Card */}
          <div className="pt-1 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-slate-700 hover:border-blue-500 transition-colors">
                {currentAdmin?.avatar || (currentAdmin?.name ? currentAdmin.name.slice(0, 2).toUpperCase() : 'AD')}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentAdmin?.name || 'Sr. Lead Auditor'}
                  </div>
                  <div className="text-[10px] text-blue-600 font-mono font-semibold truncate">
                    AdminOps Node
                  </div>
                </div>
              )}
            </div>

            {/* Collapse toggle (Desktop only) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              {isCollapsed ? (
                <ChevronsRight className="w-4 h-4" />
              ) : (
                <ChevronsLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
