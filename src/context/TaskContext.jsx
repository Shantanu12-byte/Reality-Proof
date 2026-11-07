import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { taskApi, workerApi, dashboardApi, paymentApi, telemetryApi, intelligenceApi, verificationApi, checkBackendHealth } from '../services/api';
import { workersData } from '../data/workersData';
import { clientLogger } from '@/shared/utils/logger';

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  // Pure dynamic state initialized with registered workers default
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState(workersData);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('Last 14 Days');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTaskForDetail, setActiveTaskForDetail] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const addToast = useCallback((title, message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch all core resources from MongoDB backend
  const refreshData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      // 1. Fetch live Tasks from MongoDB
      try {
        const tasksData = await taskApi.getAll();
        if (Array.isArray(tasksData)) {
          setTasks(tasksData);
        }
      } catch (tErr) {
        clientLogger.warn('TaskContext', 'Task sync notice:', tErr.message);
      }

      // 2. Fetch live Workers from MongoDB
      try {
        const liveWorkers = await workerApi.getAll();
        if (Array.isArray(liveWorkers) && liveWorkers.length > 0) {
          setWorkers(liveWorkers);
        } else {
          setWorkers((prev) => (prev && prev.length > 0 ? prev : workersData));
        }
      } catch (wErr) {
        clientLogger.warn('TaskContext', 'Worker sync notice:', wErr.message);
        setWorkers((prev) => (prev && prev.length > 0 ? prev : workersData));
      }

      // 3. Fetch live Dashboard summary
      try {
        const summary = await dashboardApi.getSummary();
        if (summary) {
          setDashboardSummary(summary);
        }
      } catch (sErr) {
        clientLogger.warn('TaskContext', 'Summary sync notice:', sErr.message);
      }

      // 4. Fetch live Dashboard exceptions
      try {
        const exceptionsData = await dashboardApi.getExceptions();
        if (Array.isArray(exceptionsData)) {
          setExceptions(exceptionsData);
        }
      } catch (eErr) {
        clientLogger.warn('TaskContext', 'Exceptions sync notice:', eErr.message);
      }

      // 5. Fetch live Dashboard activities / audit trail
      try {
        const activitiesData = await dashboardApi.getActivity(15);
        if (Array.isArray(activitiesData)) {
          setActivities(activitiesData);

          // Dynamically derive notifications from recent system activities
          if (activitiesData.length > 0) {
            const notifs = activitiesData.slice(0, 5).map((act, idx) => ({
              id: act._id || `notif-${idx}`,
              title: act.title || act.activityType || 'System Event',
              message: act.description || act.details || '',
              time: act.formattedTime || (act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'),
              read: false,
              severity: act.level === 'danger' || act.level === 'critical' ? 'critical' : act.level === 'warning' ? 'high' : 'success',
              taskId: act.taskId,
            }));
            setNotifications(notifs);
          }
        }
      } catch (aErr) {
        clientLogger.warn('TaskContext', 'Activity sync notice:', aErr.message);
      }

      setIsBackendConnected(true);
    } catch (error) {
      clientLogger.warn('TaskContext', 'Backend connection notice:', error.message);
      setIsBackendConnected(false);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Backward compatible alias
  const loadBackendData = refreshData;

  // Initialize on mount: fetch live data from MongoDB Atlas
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Create Task with genuine MongoDB persistence - zero fake fallback mock creation
  const addTask = async (newTaskInput) => {
    try {
      const createdFromApi = await taskApi.create({
        name: newTaskInput.name,
        title: newTaskInput.name,
        description: newTaskInput.description,
        location: newTaskInput.location,
        address: newTaskInput.address,
        workerName: newTaskInput.workerName,
        budget: newTaskInput.budget,
        deadline: newTaskInput.deadline,
        requiredEvidence: newTaskInput.requiredEvidence || newTaskInput.evidenceList,
      });

      // Update state with genuine database document
      setTasks((prev) => [createdFromApi, ...prev]);
      setIsBackendConnected(true);

      // Refresh live metrics and activities from MongoDB
      refreshData(true);

      addToast(
        'Task Dispatched & Saved to MongoDB',
        `${createdFromApi.taskId || createdFromApi.id} — "${createdFromApi.title || createdFromApi.name}" assigned to ${createdFromApi.worker?.name || newTaskInput.workerName}`,
        'success'
      );

      return createdFromApi;
    } catch (apiError) {
      clientLogger.error('TaskContext', 'Backend task create failed:', apiError.message);
      addToast(
        'Task Creation Failed',
        apiError.message || 'Error communicating with MongoDB backend',
        'danger'
      );
      throw apiError;
    }
  };

  // Update Task with genuine MongoDB persistence
  const updateTask = async (taskId, updates, toastMsg = 'Task Updated') => {
    try {
      const updated = await taskApi.update(taskId, updates);
      setIsBackendConnected(true);

      // Update local state directly with returned MongoDB document
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId || t.taskId === taskId ? updated : t))
      );

      if (activeTaskForDetail && (activeTaskForDetail.id === taskId || activeTaskForDetail.taskId === taskId)) {
        setActiveTaskForDetail(updated);
      }

      // Re-sync live metrics silently
      refreshData(true);

      addToast(
        'Task Updated in MongoDB',
        toastMsg,
        updated.verificationStatus === 'Verified' || updated.aiResult === 'Verified' ? 'success' : 'info'
      );
      return updated;
    } catch (err) {
      clientLogger.error('TaskContext', 'Task update API failed:', err.message);
      addToast('Task Update Failed', err.message || 'Error updating task in database', 'danger');
      throw err;
    }
  };

  // Verify task via backend engine
  const verifyTask = async (taskId, payload = {}) => {
    return updateTask(
      taskId,
      { ...payload, runVerification: true },
      `Verification evaluated for ${taskId}`
    );
  };

  // Run AI Vision Verification Pipeline (Phase 4)
  const analyzeTaskEvidence = async (taskId, evidencePayload) => {
    try {
      const res = await verificationApi.analyze(taskId, evidencePayload);
      setIsBackendConnected(true);
      await refreshData(true);
      const isMock = res.isMock;
      addToast(
        isMock ? 'AI Verification Complete (Mock Mode)' : 'AI Vision Verification Complete',
        `Task ${taskId}: Assessment "${res.overallAssessment?.toUpperCase()}", Recommendation "${res.recommendation?.toUpperCase()}". Risk score: ${res.riskScore}/100.`,
        res.overallAssessment === 'pass' ? 'success' : res.overallAssessment === 'fail' ? 'danger' : 'warn'
      );
      return res;
    } catch (err) {
      clientLogger.error('TaskContext', 'AI analysis failed:', err.message);
      addToast('AI Analysis Failed', err.message || 'Error executing AI vision pipeline', 'danger');
      throw err;
    }
  };

  // Retry Verification
  const retryVerification = async (verificationId) => {
    try {
      const res = await verificationApi.retry(verificationId);
      await refreshData(true);
      addToast('Verification Retried', `Re-analyzed task ${res.taskId} with updated pipeline findings.`, 'info');
      return res;
    } catch (err) {
      clientLogger.error('TaskContext', 'Retry verification failed:', err.message);
      addToast('Retry Failed', err.message, 'danger');
      throw err;
    }
  };

  // Human Reviewer Override
  const reviewVerification = async (verificationId, reviewData) => {
    try {
      const res = await verificationApi.review(verificationId, reviewData);
      await refreshData(true);
      addToast(
        'Human Decision Recorded',
        `Decision "${reviewData.decision}" saved for task ${res.taskId}.`,
        reviewData.decision === 'approve' ? 'success' : reviewData.decision === 'reject' ? 'danger' : 'info'
      );
      return res;
    } catch (err) {
      clientLogger.error('TaskContext', 'Review submission failed:', err.message);
      addToast('Review Failed', err.message, 'danger');
      throw err;
    }
  };

  // Delete Task with genuine MongoDB deletion
  const deleteTask = async (taskId) => {
    try {
      await taskApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId && t.taskId !== taskId));
      if (activeTaskForDetail && (activeTaskForDetail.id === taskId || activeTaskForDetail.taskId === taskId)) {
        setActiveTaskForDetail(null);
      }
      refreshData(true);
      addToast('Task Deleted', `Task ${taskId} removed from MongoDB`, 'info');
    } catch (err) {
      clientLogger.error('TaskContext', 'Delete task API failed:', err.message);
      addToast('Delete Failed', err.message || 'Could not delete task from database', 'danger');
      throw err;
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Dynamically compute KPIs agreeing with actual live database records
  const dynamicKpis = useMemo(() => {
    const verifiedCount = tasks.filter((t) => (t.aiResult || t.verificationStatus) === 'Verified').length;
    const reviewCount = tasks.filter((t) => (t.aiResult || t.verificationStatus) === 'Review Required').length;
    const flaggedCount = tasks.filter((t) => (t.aiResult || t.verificationStatus) === 'Failed').length;
    const totalCount = tasks.length;

    // Calculate pending payment sum from tasks
    const pendingPaymentTotal = tasks
      .filter((t) => t.paymentStatus === 'Pending')
      .reduce((sum, t) => {
        const val = typeof t.budget === 'number'
          ? t.budget
          : parseFloat(String(t.budget).replace(/[^0-9.]/g, '')) || 0;
        return sum + val;
      }, 0);

    const pendingPaymentCount = tasks.filter((t) => t.paymentStatus === 'Pending').length;

    const verifiedPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;
    const reviewPercent = totalCount > 0 ? Math.round((reviewCount / totalCount) * 100) : 0;
    const flaggedPercent = totalCount > 0 ? Math.max(0, 100 - verifiedPercent - reviewPercent) : 0;

    return [
      {
        id: 'total_tasks',
        label: 'Total Tasks',
        value: totalCount.toLocaleString(),
        numericValue: totalCount,
        change: '+100%',
        isPositive: true,
        comparison: 'Live MongoDB records',
        badgeVariant: 'neutral',
        secondaryNote: 'Across operational zones',
      },
      {
        id: 'verified',
        label: 'Verified',
        value: verifiedCount.toLocaleString(),
        numericValue: verifiedCount,
        change: `${verifiedPercent}%`,
        isPositive: true,
        comparison: `${verifiedPercent}% auto-verified`,
        badgeVariant: 'verified',
        secondaryNote: 'Dynamic verification',
      },
      {
        id: 'under_review',
        label: 'Under Review',
        value: reviewCount.toLocaleString(),
        numericValue: reviewCount,
        change: `${reviewPercent}%`,
        isPositive: true,
        comparison: `${reviewPercent}% queue load`,
        badgeVariant: 'review',
        secondaryNote: 'Manual triage active',
      },
      {
        id: 'flagged',
        label: 'Flagged',
        value: flaggedCount.toLocaleString(),
        numericValue: flaggedCount,
        change: `${flaggedPercent}%`,
        isPositive: false,
        comparison: `${flaggedPercent}% anomaly rate`,
        badgeVariant: 'failed',
        secondaryNote: 'Spoofing & geo-fencing',
      },
      {
        id: 'payment_pending',
        label: 'Payment Pending',
        value: `$${pendingPaymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        numericValue: pendingPaymentTotal,
        change: `${pendingPaymentCount} tasks`,
        isPositive: null,
        comparison: 'Escrow hold',
        badgeVariant: 'brand',
        secondaryNote: 'PayPal release queued',
      },
    ];
  }, [tasks]);

  // Dynamic Verification Outcomes matching actual MongoDB numbers
  const dynamicOutcomes = useMemo(() => {
    const verifiedCount = tasks.filter((t) => (t.aiResult || t.verificationStatus) === 'Verified').length;
    const reviewCount = tasks.filter((t) => (t.aiResult || t.verificationStatus) === 'Review Required').length;
    const flaggedCount = tasks.filter((t) => (t.aiResult || t.verificationStatus) === 'Failed').length;
    const total = verifiedCount + reviewCount + flaggedCount || 1;

    const vPercent = totalCountNonZero(total) ? Math.round((verifiedCount / total) * 100) : 0;
    const rPercent = totalCountNonZero(total) ? Math.round((reviewCount / total) * 100) : 0;
    const fPercent = totalCountNonZero(total) ? Math.max(0, 100 - vPercent - rPercent) : 0;

    function totalCountNonZero(t) {
      return (verifiedCount + reviewCount + flaggedCount) > 0;
    }

    return [
      { name: 'Verified', value: vPercent, count: verifiedCount, color: '#10b981' },
      { name: 'Needs review', value: rPercent, count: reviewCount, color: '#f59e0b' },
      { name: 'Failed', value: fPercent, count: flaggedCount, color: '#ef4444' },
    ];
  }, [tasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        setTasks,
        workers,
        setWorkers,
        dashboardSummary,
        exceptions,
        activities,
        dynamicKpis,
        dynamicOutcomes,
        selectedDateRange,
        setSelectedDateRange,
        searchQuery,
        setSearchQuery,
        activeTaskForDetail,
        setActiveTaskForDetail,
        isCreateModalOpen,
        setIsCreateModalOpen,
        notifications,
        setNotifications,
        markAllNotificationsRead,
        toasts,
        addToast,
        removeToast,
        addTask,
        updateTask,
        verifyTask,
        analyzeTaskEvidence,
        retryVerification,
        reviewVerification,
        deleteTask,
        refreshData,
        loadBackendData,
        isLoading,
        isBackendConnected,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

export default TaskContext;

