import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '../components/common/Toast';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskDetailDrawer } from '../components/tasks/TaskDetailDrawer';

export const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F8FD] text-slate-800 flex flex-col font-sans">
      {/* Fixed Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Topbar setIsMobileOpen={setIsMobileOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <CreateTaskModal />
      <TaskDetailDrawer />
      <ToastContainer />
    </div>
  );
};
