import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PaginatedResponse, ServiceRequest } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isEmployee, isManager, isOperations } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<ServiceRequest>>({
    queryKey: ['requests', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/requests?per_page=5');
      return res.data;
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading your dashboard overview..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Could not retrieve service requests from the server."
        onRetry={() => refetch()}
      />
    );
  }

  const requests = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Workspace Active: {user?.role.toUpperCase()}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
            {isEmployee && 'Track and create service requests, monitor approval workflows, and collaborate with teams.'}
            {isManager && 'Review and authorize pending service requests submitted by your direct reporting staff.'}
            {isOperations && 'Process approved service requests, assign technicians, and track fulfillment to completion.'}
          </p>
        </div>

        {isEmployee && (
          <Link
            to="/requests/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 shadow-sm transition shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            New Request
          </Link>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isEmployee ? 'My Requests' : 'Total Accessible'}
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total requests in your role scope</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Review
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {requests.filter((r) => r.status === 'submitted').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting manager decision</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {requests.filter((r) => r.status === 'in_progress').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Actively being worked on</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {requests.filter((r) => r.status === 'completed').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Successfully fulfilled</p>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Service Requests</h2>
            <p className="text-xs text-slate-500">Quick snapshot of your most recent activity</p>
          </div>
          <Link
            to="/requests"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No service requests found in this view.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {req.request_number}
                    </span>
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{req.title}</h3>
                  <p className="text-xs text-slate-400">
                    Requested by <span className="text-slate-600 font-medium">{req.requester?.name}</span> •{' '}
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to={`/requests/${req.id}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white hover:border-slate-300 text-slate-700 shadow-xs transition"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
