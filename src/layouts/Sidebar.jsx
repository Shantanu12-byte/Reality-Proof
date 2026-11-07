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
  Sparkles
} from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { tasks, workers } = useTaskContext();
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
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare, badge: tasks.length.toString() },
    { path: '/verification', label: 'AI Verification', icon: ScanEye, badge: 'Live' },
    { path: '/live-map', label: 'Live Map', icon: MapPin },
    {
      path: '/intelligence',
      label: 'Intelligence',
      icon: BrainCircuit,
      badge: `${flaggedCount} Flags`,
      badgeColor: flaggedCount > 0 ? 'rose' : 'purple',
    },
    {
      path: '/payments',
      label: 'Payments',
      icon: CreditCard,
      badge: `$${Math.round(pendingPaymentSum)}`,
    },
    {
      path: '/workers',
      label: 'Workers',
      icon: Users,
      badge: `${activeWorkersCount} Active`,
    },
  ];

  const bottomNavItems = [
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/help', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-[#EEF2F6] transition-all duration-300 ease-in-out select-none shadow-[2px_0_16px_rgba(0,0,0,0.02)] ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 flex items-center justify-between px-4 sm:px-5 border-b border-[#F1F4F9]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#6C5DD3] flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/25 text-white transition-transform duration-300 hover:scale-105">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-reckless text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                  RealityProof
                  <span className="text-[9px] uppercase tracking-wider font-sans font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-[#6C5DD3]">
                    Ops
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  Task Verification Platform
                </span>
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
          <div className="p-3 border-b border-[#F1F4F9] relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F8FAFC] hover:bg-purple-50/60 text-left border border-[#E9EFF6] text-xs transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#6C5DD3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-slate-800 font-semibold truncate text-xs">
                    {selectedWorkspace}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Zone: IN-MAH-PROD
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Workspace Dropdown */}
            {workspaceMenuOpen && (
              <div className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.name}
                    onClick={() => {
                      setSelectedWorkspace(ws.name);
                      setWorkspaceMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-purple-50 transition-colors"
                  >
                    <div>
                      <div className="text-slate-800 font-medium">{ws.name}</div>
                      <div className="text-[10px] text-slate-400">{ws.env} • {ws.region}</div>
                    </div>
                    {selectedWorkspace === ws.name && (
                      <Check className="w-4 h-4 text-[#6C5DD3]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 border-b border-[#F1F4F9] flex justify-center">
            <div
              title={selectedWorkspace}
              className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100 text-[#6C5DD3] hover:scale-105 transition-transform"
            >
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Menu
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
                    ? 'bg-[#6C5DD3] text-white shadow-md shadow-purple-500/25'
                    : 'text-slate-500 hover:text-[#6C5DD3] hover:bg-purple-50/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6C5DD3]'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-purple-50 text-[#6C5DD3] border border-purple-100'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[#F1F4F9] bg-[#FAFBFF] space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Others
            </div>
          )}
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#6C5DD3] text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-500 hover:text-[#6C5DD3] hover:bg-purple-50/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6C5DD3]'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}

          {/* User Profile Card */}
          <div className="pt-2 border-t border-[#EEF2F6] flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C5DD3] to-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
                SC
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    Shantanu C.
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    Operations Lead
                  </div>
                </div>
              )}
            </div>

            {/* Collapse toggle (Desktop only) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
