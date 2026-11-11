import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useCreateModal } from '@/context/CreateModalContext';
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
  const { openCreateModal, openEditModal } = useCreateModal();

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
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 border border-indigo-500/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/15 text-indigo-100 text-[11px] sm:text-xs font-semibold backdrop-blur-xs mb-2 sm:mb-3 border border-white/20">
            <UserCheck className="w-3.5 h-3.5" />
            Reporting to: {user?.manager ? user.manager.name : 'Unassigned Manager'}
          </div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Create, track, and collaborate on your equipment, software, and facility requests with real-time status updates.
          </p>
        </div>

        {/* Modal Window Trigger */}
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white text-indigo-700 font-bold text-xs sm:text-sm hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Request
        </button>
      </div>

      {/* Action Required Alert: Returned Requests */}
      {returnedRequests.length > 0 && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="p-2 sm:p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-amber-950">
                Action Required: {returnedRequests.length} Request{returnedRequests.length > 1 ? 's' : ''} Returned for Revision
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                Your manager requested adjustments before approval can proceed.
              </p>

              <div className="mt-3 space-y-2">
                {returnedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-white rounded-xl border border-amber-200 shadow-xs text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px]">
                          {req.request_number}
                        </span>
                        <span className="font-bold text-slate-900 truncate">{req.title}</span>
                      </div>
                      <p className="text-slate-600 text-[10px] sm:text-[11px]">
                        Category: <span className="font-medium text-slate-800">{req.category}</span> • Priority:{' '}
                        <span className="capitalize font-medium text-slate-800">{req.priority}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit & Resubmit
                      </button>
                      <Link
                        to={`/requests/${req.id}`}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
              Total Requests
            </span>
            <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 sm:mt-2">{totalCount}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Submitted in account</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
              Pending Review
            </span>
            <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 sm:mt-2">{pendingCount}</p>
          <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-0.5 sm:mt-1 truncate">Awaiting manager</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 sm:p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 sm:mt-2">{inProgressCount}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Operations fulfilling</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 sm:mt-2">{completedCount}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Fulfilled successfully</p>
        </div>
      </div>

      {/* My Recent Requests Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Service Requests</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live tracking and status overview of your submissions</p>
          </div>
          <Link
            to="/requests"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition"
          >
            View all requests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="You haven't created any service requests yet. Start by submitting your first request."
            actionLabel="Create Request"
            onAction={openCreateModal}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {req.request_number}
                    </span>
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{req.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Category: <strong className="text-slate-700">{req.category}</strong></span>
                    <span>•</span>
                    <span>Created: {new Date(req.created_at).toLocaleDateString()}</span>
                    {req.sla_due_at && (
                      <>
                        <span>•</span>
                        <span className={req.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          SLA Due: {new Date(req.sla_due_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(req.status === 'draft' || req.status === 'returned') && (
                    <button
                      type="button"
                      onClick={() => openEditModal(req.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  <Link
                    to={`/requests/${req.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition"
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
