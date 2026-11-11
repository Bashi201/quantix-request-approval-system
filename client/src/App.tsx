import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RequestsListPage } from '@/pages/RequestsListPage';
import { CreateRequestPage } from '@/pages/CreateRequestPage';
import { RequestDetailPage } from '@/pages/RequestDetailPage';
import { OperationsTeamPage } from '@/pages/OperationsTeamPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Authenticated Workspace Application */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="requests" element={<RequestsListPage />} />
                  <Route
                    path="requests/new"
                    element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <CreateRequestPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="requests/:id" element={<RequestDetailPage />} />
                  <Route
                    path="users/operations"
                    element={
                      <ProtectedRoute allowedRoles={['operations', 'manager']}>
                        <OperationsTeamPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>
              </Route>

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
