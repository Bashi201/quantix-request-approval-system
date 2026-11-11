import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { OperationsDashboard } from '@/components/dashboard/OperationsDashboard';
import { LoadingState } from '@/components/common/LoadingState';

export const DashboardPage: React.FC = () => {
  const { user, isEmployee, isManager, isOperations, isLoading } = useAuth();

  if (isLoading || !user) {
    return <LoadingState message="Loading your personalized dashboard..." />;
  }

  if (isEmployee) {
    return <EmployeeDashboard />;
  }

  if (isManager) {
    return <ManagerDashboard />;
  }

  if (isOperations) {
    return <OperationsDashboard />;
  }

  return (
    <div className="p-8 text-center text-slate-500">
      Unknown account role ({user.role}). Please contact administrator.
    </div>
  );
};
