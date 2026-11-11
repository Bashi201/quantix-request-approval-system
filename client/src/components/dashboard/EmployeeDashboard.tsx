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
import { EmptyState } from '@/components/common/EmptyState';
import {
  PlusCircle,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Edit,
  Eye,
  UserCheck,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<ServiceRequest>>({
    queryKey: ['requests', 'employee-dashboard'],
    queryFn: async () => {
      const res = await api.get('/requests?per_page=10');
      return res.data;
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading your employee portal..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message="Could not retrieve your service requests from the server."
        onRetry={() => refetch()}
      />
    );
  }

  const requests = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;
  const pendingCount = requests.filter((r) => r.status === 'submitted').length;
  const returnedRequests = requests.filter((r) => r.status === 'returned');
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <UserCheck className="w-3.5 h-3.5" />
            Reporting to: {user?.manager ? user.manager.name : 'Unassigned Manager'}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
            Create, track, and collaborate on your equipment, software, and facility requests.
          </p>
        </div>

        <Link
          to="/requests/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 shadow-sm transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Request
        </Link>
      </div>

      {/* Action Required Alert: Returned Requests */}
      {returnedRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-amber-900">
                Action Required: {returnedRequests.length} Request{returnedRequests.length > 1 ? 's' : ''} Returned for Revision
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Your manager requested adjustments before approval can proceed.
              </p>

              <div className="mt-3 space-y-2">
                {returnedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-amber-200/80 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600">{req.request_number}</span>
                        <span className="font-semibold text-slate-800 truncate">{req.title}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Category: {req.category} • Priority: <span className="capitalize">{req.priority}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/requests/${req.id}/edit`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit & Resubmit
                      </Link>
                      <Link
                        to={`/requests/${req.id}`}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Requests
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Submitted in your account</p>
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
          <p className="text-2xl font-bold text-slate-900 mt-2">{pendingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting manager decision</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{inProgressCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Operations team fulfilling</p>
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
          <p className="text-2xl font-bold text-slate-900 mt-2">{completedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Fulfilled successfully</p>
        </div>
      </div>

      {/* My Recent Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">My Service Requests</h2>
            <p className="text-xs text-slate-500">Live tracking of your submissions</p>
          </div>
          <Link
            to="/requests"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition"
          >
            View all requests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="You haven't created any service requests yet. Start by submitting your first request."
            actionLabel="Create Request"
            onAction={() => (window.location.href = '/requests/new')}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Category: {req.category}</span>
                    <span>•</span>
                    <span>Created: {new Date(req.created_at).toLocaleDateString()}</span>
                    {req.sla_due_at && (
                      <>
                        <span>•</span>
                        <span className={req.is_overdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          SLA Due: {new Date(req.sla_due_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(req.status === 'draft' || req.status === 'returned') && (
                    <Link
                      to={`/requests/${req.id}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                  )}
                  <Link
                    to={`/requests/${req.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
                  >
                    View Details
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
