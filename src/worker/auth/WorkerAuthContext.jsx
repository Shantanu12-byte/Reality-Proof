import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { workerApi } from '../services/workerApi';

const WorkerAuthContext = createContext(null);

const DEFAULT_DEMO_WORKERS = [
  {
    workerId: 'WRK001',
    name: 'Neha Joshi',
    email: 'wrk001@fieldforce.realityproof.ai',
    city: 'Pune',
    zone: 'Pune West & Central',
    rating: 5.0,
    accuracy: 99.4,
    completedJobs: 142,
    balance: 1420.0,
    status: 'Active',
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK002',
    name: 'Rahul Sharma',
    email: 'wrk002@fieldforce.realityproof.ai',
    city: 'Pune',
    zone: 'Pune East / Viman Nagar',
    rating: 4.9,
    accuracy: 98.2,
    completedJobs: 98,
    balance: 850.0,
    status: 'Active',
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK003',
    name: 'Kavita Deshmukh',
    email: 'wrk003@fieldforce.realityproof.ai',
    city: 'Mumbai',
    zone: 'Mumbai Suburban',
    rating: 4.9,
    accuracy: 97.8,
    completedJobs: 210,
    balance: 2310.0,
    status: 'Active',
    paypalStatus: 'Linked & Verified',
  },
  {
    workerId: 'WRK004',
    name: 'Aman Verma',
    email: 'wrk004@fieldforce.realityproof.ai',
    city: 'Nagpur',
    zone: 'Nagpur Logistics Hub',
    rating: 4.8,
    accuracy: 96.5,
    completedJobs: 76,
    balance: 620.0,
    status: 'Active',
    paypalStatus: 'Linked & Verified',
  },
];

export const WorkerAuthProvider = ({ children }) => {
  const [currentWorker, setCurrentWorker] = useState(() => {
    try {
      const saved = localStorage.getItem('realityproof_worker_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [workerToken, setWorkerToken] = useState(() => {
    try {
      return localStorage.getItem('realityproof_worker_token') || null;
    } catch {
      return null;
    }
  });

  const [demoWorkers, setDemoWorkers] = useState(DEFAULT_DEMO_WORKERS);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setCurrentWorker(null);
    setWorkerToken(null);
    try {
      localStorage.removeItem('realityproof_worker_session');
      localStorage.removeItem('realityproof_worker_id');
      localStorage.removeItem('realityproof_worker_token');
    } catch (e) {
      // ignore
    }
  }, []);

  // Load available demo workers from backend API
  const loadDemoWorkers = useCallback(async () => {
    try {
      const res = await workerApi.getDemoList();
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setDemoWorkers(list);
      }
    } catch (err) {
      console.warn('[WorkerAuth] Using offline demo workers fallback:', err.message);
    }
  }, []);

  // Fetch or refresh active worker session from backend
  const refreshWorker = useCallback(async () => {
    const token = localStorage.getItem('realityproof_worker_token');
    if (!token) {
      setIsLoading(false);
      return null;
    }

    try {
      const res = await workerApi.getMe();
      const worker = res?.data || (res?.workerId ? res : null);
      if (worker && worker.workerId) {
        setCurrentWorker(worker);
        localStorage.setItem('realityproof_worker_session', JSON.stringify(worker));
      }
      return worker;
    } catch (err) {
      console.warn('[WorkerAuth] Failed to refresh worker session from server:', err.message);
      if (err.status === 401 || err.status === 403) {
        logout();
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadDemoWorkers();
    refreshWorker();
  }, [loadDemoWorkers, refreshWorker]);

  const login = async (workerIdInput, passwordInput) => {
    setIsLoading(true);
    try {
      const wId = String(workerIdInput || '').trim();
      const pwd = String(passwordInput || '').trim();

      if (!wId) {
        throw new Error('Please enter your Worker ID (e.g. WRK001, WRK002)');
      }
      if (!pwd) {
        throw new Error('Please enter your password.');
      }

      const res = await workerApi.login({
        workerId: wId,
        password: pwd,
      });

      if (!res.success || !res.token) {
        throw new Error(res.message || 'Worker authentication failed.');
      }

      const workerData = res.data || res.worker;
      const token = res.token;

      setCurrentWorker(workerData);
      setWorkerToken(token);

      localStorage.setItem('realityproof_worker_session', JSON.stringify(workerData));
      localStorage.setItem('realityproof_worker_id', workerData.workerId);
      localStorage.setItem('realityproof_worker_token', token);

      return workerData;
    } catch (err) {
      console.error('[WorkerAuth] Login error:', err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WorkerAuthContext.Provider
      value={{
        currentWorker,
        workerToken,
        isAuthenticated: !!currentWorker && !!workerToken,
        demoWorkers,
        isLoading,
        login,
        logout,
        refreshWorker,
        workerId: currentWorker?.workerId || null,
      }}
    >
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => {
  const context = useContext(WorkerAuthContext);
  if (!context) {
    throw new Error('useWorkerAuth must be used within a WorkerAuthProvider');
  }
  return context;
};

export default WorkerAuthContext;
