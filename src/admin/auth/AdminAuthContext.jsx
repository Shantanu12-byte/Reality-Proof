import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('realityproof_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem('realityproof_admin_token') || null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setCurrentAdmin(null);
    setAdminToken(null);
    try {
      localStorage.removeItem('realityproof_admin_session');
      localStorage.removeItem('realityproof_admin_token');
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshAdmin = useCallback(async () => {
    const token = localStorage.getItem('realityproof_admin_token');
    if (!token) {
      setIsLoading(false);
      return null;
    }

    try {
      const admin = await adminApi.getMe();
      if (admin) {
        setCurrentAdmin(admin);
        localStorage.setItem('realityproof_admin_session', JSON.stringify(admin));
      }
      return admin;
    } catch (err) {
      console.warn('[AdminAuth] Session verification error:', err.message);
      if (err.status === 401 || err.status === 403) {
        logout();
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  const login = async (identifier, password) => {
    setIsLoading(true);
    try {
      const idStr = String(identifier || '').trim();
      if (!idStr || !password) {
        throw new Error('Please enter both Admin username/email and password.');
      }

      const res = await adminApi.login({
        username: idStr,
        email: idStr,
        password,
      });

      if (!res.success || !res.token) {
        throw new Error(res.message || 'Administrator authentication failed.');
      }

      const adminUser = res.admin || res.data;
      const token = res.token;

      setCurrentAdmin(adminUser);
      setAdminToken(token);

      localStorage.setItem('realityproof_admin_session', JSON.stringify(adminUser));
      localStorage.setItem('realityproof_admin_token', token);

      return adminUser;
    } catch (err) {
      console.error('[AdminAuth] Login failure:', err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        currentAdmin,
        adminToken,
        isAuthenticated: !!currentAdmin && !!adminToken,
        isLoading,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export default AdminAuthContext;
