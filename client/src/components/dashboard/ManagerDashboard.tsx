import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import type { PaginatedResponse, ServiceRequest } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  ArrowRight,
  Eye,
  AlertCircle,
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    request: ServiceRequest | null;
    action: 'approve' | 'reject' | 'return' | null;
    comment: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    request: null,
    action: null,
    comment: '',
    isSubmitting: false,
  });

  // Fetch all requests accessible by the manager
  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<ServiceRequest>>({
    queryKey: ['requests', 'manager-dashboard'],
    queryFn: async () => {
      const res = await api.get('/requests?per_page=15');
      return res.data;
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading manager approval queue..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load manager queue"
        message="Could not retrieve department requests."
        onRetry={() => refetch()}
      />
    );
  }

  const allRequests = data?.data ?? [];
  const pendingApprovals = allRequests.filter((r) => r.status === 'submitted');
  const approvedRequests = allRequests.filter((r) => r.status === 'approved');
  const returnedRequests = allRequests.filter((r) => r.status === 'returned');
  const rejectedRequests = allRequests.filter((r) => r.status === 'rejected');

  const handleDecisionSubmit = async () => {
    const { request, action, comment } = decisionModal;
    if (!request || !action) return;

    if ((action === 'reject' || action === 'return') && !comment.trim()) {
      toast.error('A comment explaining the reason is required for return or rejection.');
      return;
    }

    setDecisionModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await api.post(`/requests/${request.id}/decision`, {
        action,
        comment: comment.trim() || undefined,
      });

      toast.success(
        action === 'approve'
          ? `Request ${request.request_number} approved successfully.`
          : action === 'reject'
          ? `Request ${request.request_number} rejected.`
          : `Request ${request.request_number} returned to requester.`
      );

      setDecisionModal({
        isOpen: false,
        request: null,
        action: null,
        comment: '',
        isSubmitting: false,
      });

      queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit decision.');
      setDecisionModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-indigo-500/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Managerial Oversight Authority
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Manager Review Portal — {user?.name}
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Review and make decisions on service requests submitted by your direct reporting personnel.
          </p>
        </div>

        <div className="bg-white/15 backdrop-blur-xs border border-white/25 px-6 py-3.5 rounded-2xl text-center shrink-0 shadow-xs">
          <p className="text-3xl font-extrabold text-white">{pendingApprovals.length}</p>
          <p className="text-xs text-indigo-100 font-semibold mt-0.5">Pending Review</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Pending Decisions
            </span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{pendingApprovals.length}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Requires immediate review</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Approved
            </span>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{approvedRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Routed to Operations</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Returned
            </span>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{returnedRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Returned for revision</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Rejected
            </span>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{rejectedRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Declined requests</p>
        </div>
      </div>

      {/* Priority Section: Pending Approvals Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Pending Team Approvals Queue</h2>
              {pendingApprovals.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {pendingApprovals.length} Action Needed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Service requests submitted by your team awaiting your decision</p>
          </div>

          <Link
            to="/requests?status=submitted"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition"
          >
            Filter Queue <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingApprovals.length === 0 ? (
          <EmptyState
            title="All caught up!"
            description="There are currently no pending service requests waiting for your approval."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {req.request_number}
                    </span>
                    <PriorityBadge priority={req.priority} />
                    <span className="text-xs text-slate-400">
                      Submitted {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800">{req.title}</h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Requester: {req.requester?.name}</span>
                    <span>({req.requester?.email})</span>
                    <span>•</span>
                    <span>Category: {req.category}</span>
                  </div>
                </div>

                {/* Manager Fast-Decision Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() =>
                      setDecisionModal({
                        isOpen: true,
                        request: req,
                        action: 'return',
                        comment: '',
                        isSubmitting: false,
                      })
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Return
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setDecisionModal({
                        isOpen: true,
                        request: req,
                        action: 'reject',
                        comment: '',
                        isSubmitting: false,
                      })
                    }
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>

                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() =>
                      setDecisionModal({
                        isOpen: true,
                        request: req,
                        action: 'approve',
                        comment: '',
                        isSubmitting: false,
                      })
                    }
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>

                  <Link
                    to={`/requests/${req.id}`}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                    title="View Request Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {decisionModal.isOpen && decisionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600">
                {decisionModal.request.request_number}
              </span>
              <PriorityBadge priority={decisionModal.request.priority} />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              {decisionModal.action === 'approve' && 'Approve Service Request'}
              {decisionModal.action === 'reject' && 'Reject Service Request'}
              {decisionModal.action === 'return' && 'Return Request for Revision'}
            </h3>

            <p className="text-xs text-slate-500">
              {decisionModal.action === 'approve' &&
                'Approving this request will route it immediately to Operations for fulfillment.'}
              {decisionModal.action === 'reject' &&
                'Please specify the reason for rejection. This decision is terminal.'}
              {decisionModal.action === 'return' &&
                'Please describe the revisions or missing information required from the employee.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {decisionModal.action === 'approve' ? 'Optional Approval Note' : 'Decision Justification'}
                {(decisionModal.action === 'reject' || decisionModal.action === 'return') && (
                  <span className="text-rose-500 ml-1">*</span>
                )}
              </label>
              <textarea
                value={decisionModal.comment}
                onChange={(e) =>
                  setDecisionModal((prev) => ({ ...prev, comment: e.target.value }))
                }
                rows={3}
                placeholder={
                  decisionModal.action === 'approve'
                    ? 'e.g. Approved within standard department budget.'
                    : 'Provide detailed feedback for the requester...'
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={decisionModal.isSubmitting}
                onClick={() =>
                  setDecisionModal({
                    isOpen: false,
                    request: null,
                    action: null,
                    comment: '',
                    isSubmitting: false,
                  })
                }
              >
                Cancel
              </Button>

              <Button
                size="sm"
                isLoading={decisionModal.isSubmitting}
                className={
                  decisionModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : decisionModal.action === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }
                onClick={handleDecisionSubmit}
              >
                Confirm {decisionModal.action?.toUpperCase()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

