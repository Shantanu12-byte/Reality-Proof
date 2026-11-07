import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import { ShieldCheck } from 'lucide-react';

export const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FD] flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6C5DD3] to-[#8B5CF6] text-white flex items-center justify-center shadow-lg shadow-purple-500/25 mb-4 animate-bounce">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Verifying Admin Authorization...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default AdminProtectedRoute;
