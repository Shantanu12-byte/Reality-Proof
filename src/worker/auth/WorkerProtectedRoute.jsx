import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useWorkerAuth } from './WorkerAuthContext';
import { RefreshCw } from 'lucide-react';

export const WorkerProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useWorkerAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="w-12 h-12 rounded-2xl bg-[#6C5DD3] text-white flex items-center justify-center shadow-md mb-3">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Loading Field Inspector Profile...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/worker/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default WorkerProtectedRoute;
