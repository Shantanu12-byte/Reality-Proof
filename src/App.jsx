import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TaskProvider } from './context/TaskContext';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

// Shared Role Selection Landing Page
import { RoleSelectionLandingPage } from './shared/pages/RoleSelectionLandingPage';

// Admin Application: Auth & Pages
import { AdminAuthProvider } from './admin/auth/AdminAuthContext';
import { AdminProtectedRoute } from './admin/auth/AdminProtectedRoute';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { DashboardLayout } from './admin/layouts/DashboardLayout';
import { OverviewPage } from './admin/pages/OverviewPage';
import { TasksPage } from './admin/pages/TasksPage';
import { AIVerificationPage } from './admin/pages/AIVerificationPage';
import { LiveMapPage } from './admin/pages/LiveMapPage';
import { IntelligencePage } from './admin/pages/IntelligencePage';
import { PaymentsPage } from './admin/pages/PaymentsPage';
import { WorkersPage } from './admin/pages/WorkersPage';
import { SettingsPage } from './admin/pages/SettingsPage';
import { HelpPage } from './admin/pages/HelpPage';

// Worker Application: Auth, Layout & Pages
import {
  WorkerAuthProvider,
  WorkerProtectedRoute,
  WorkerLayout,
  WorkerLoginPage,
  WorkerDashboardPage,
  WorkerTasksPage,
  WorkerTaskDetailPage,
  WorkerEvidenceCapturePage,
  WorkerSubmissionsPage,
  WorkerProfilePage,
} from './worker';

export function App() {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <WorkerAuthProvider>
          <TaskProvider>
            <BrowserRouter>
              <Routes>
                {/* Root: Professional Role-Selection Landing Page */}
                <Route path="/" element={<RoleSelectionLandingPage />} />

                {/* ============================================================ */}
                {/* ADMIN APPLICATION ROUTES                                     */}
                {/* ============================================================ */}
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* Protected Admin Console */}
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <DashboardLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<OverviewPage />} />
                  <Route path="overview" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="workers" element={<WorkersPage />} />
                  <Route path="verification" element={<AIVerificationPage />} />
                  <Route path="intelligence" element={<IntelligencePage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="map" element={<LiveMapPage />} />
                  <Route path="live-map" element={<Navigate to="/admin/map" replace />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Route>

                {/* ============================================================ */}
                {/* WORKER APPLICATION ROUTES                                    */}
                {/* ============================================================ */}
                <Route path="/worker/login" element={<WorkerLoginPage />} />

                {/* Protected Field Worker Mobile Experience */}
                <Route
                  path="/worker"
                  element={
                    <WorkerProtectedRoute>
                      <WorkerLayout />
                    </WorkerProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/worker/dashboard" replace />} />
                  <Route path="dashboard" element={<WorkerDashboardPage />} />
                  <Route path="tasks" element={<WorkerTasksPage />} />
                  <Route path="tasks/:taskId" element={<WorkerTaskDetailPage />} />
                  <Route path="tasks/:taskId/submit" element={<WorkerEvidenceCapturePage />} />
                  <Route path="submissions" element={<WorkerSubmissionsPage />} />
                  <Route path="profile" element={<WorkerProfilePage />} />
                  <Route path="*" element={<Navigate to="/worker/dashboard" replace />} />
                </Route>

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TaskProvider>
        </WorkerAuthProvider>
      </AdminAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
