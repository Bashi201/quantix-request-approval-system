import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import type { PaginatedResponse, ServiceRequest, User } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Wrench,
  CheckCircle2,
  Clock,
  PlayCircle,
  UserCheck,
  UserPlus,
  AlertCircle,
  ArrowRight,
  Eye,
  CheckCheck,
} from 'lucide-react';

export const OperationsDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'unassigned' | 'my-work' | 'all'>('unassigned');

  // Modal state for starting/completing work or assigning
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    request: ServiceRequest | null;
    action: 'in_progress' | 'completed' | 'assign' | null;
    comment: string;
    assigneeId: number | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    request: null,
    action: null,
    comment: '',
    assigneeId: null,
    isSubmitting: false,
  });

  // Fetch Operations users roster for assignments
  const { data: operationsUsersData } = useQuery<{ success: boolean; data: User[] }>({
    queryKey: ['users', 'operations'],
    queryFn: async () => {
      const res = await api.get('/users/operations');
      return res.data;
    },
  });

  // Fetch Operations service requests
  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<ServiceRequest>>({
    queryKey: ['requests', 'operations-dashboard'],
    queryFn: async () => {
      const res = await api.get('/requests?per_page=20');
      return res.data;
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading operations workspace..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load operations queue"
        message="Could not retrieve fulfillment tickets."
        onRetry={() => refetch()}
      />
    );
  }

  const allRequests = data?.data ?? [];
  const operationsStaff = operationsUsersData?.data ?? [];

  const unassignedRequests = allRequests.filter(
    (r) => r.status === 'approved' && !r.assigned_to
  );
  const myWorkRequests = allRequests.filter(
    (r) => r.assigned_to?.id === user?.id && (r.status === 'approved' || r.status === 'in_progress')
  );
  const inProgressRequests = allRequests.filter((r) => r.status === 'in_progress');
  const completedRequests = allRequests.filter((r) => r.status === 'completed');

  // Quick Assign to Self
  const handleAssignToSelf = async (req: ServiceRequest) => {
    if (!user) return;
    try {
      await api.post(`/requests/${req.id}/assign`, {
        assigned_to_id: user.id,
      });
      toast.success(`Request ${req.request_number} assigned to you.`);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed.');
    }
  };

  // Submit modal action
  const handleActionSubmit = async () => {
    const { request, action, comment, assigneeId } = actionModal;
    if (!request || !action) return;

    setActionModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      if (action === 'assign') {
        if (!assigneeId) {
          toast.error('Please select an operations specialist.');
          setActionModal((prev) => ({ ...prev, isSubmitting: false }));
          return;
        }
        await api.post(`/requests/${request.id}/assign`, {
          assigned_to_id: assigneeId,
        });
        toast.success(`Request ${request.request_number} assigned successfully.`);
      } else {
        await api.post(`/requests/${request.id}/status`, {
          status: action,
          comment: comment.trim() || undefined,
        });
        toast.success(
          action === 'in_progress'
            ? `Work started on ${request.request_number}.`
            : `Request ${request.request_number} marked as completed.`
        );
      }

      setActionModal({
        isOpen: false,
        request: null,
        action: null,
        comment: '',
        assigneeId: null,
        isSubmitting: false,
      });

      queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed.');
      setActionModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-emerald-600/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/20">
            <Wrench className="w-3.5 h-3.5" />
            Operations Fulfillment Center
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Operations Workspace — {user?.name}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Triage approved tickets, assign fulfillment specialists, execute tasks, and complete requests.
          </p>
        </div>

        <div className="bg-white/15 backdrop-blur-xs border border-white/25 px-6 py-3.5 rounded-2xl text-center shrink-0 shadow-xs">
          <p className="text-3xl font-extrabold text-white">{unassignedRequests.length}</p>
          <p className="text-xs text-emerald-100 font-semibold mt-0.5">Unassigned In Queue</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Awaiting Assignment
            </span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{unassignedRequests.length}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Ready for ticket assignment</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              My Active Queue
            </span>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{myWorkRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Assigned directly to you</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{inProgressRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active fulfillment tasks</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{completedRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Closed successfully</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'unassigned'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Unassigned Queue
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {unassignedRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my-work')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'my-work'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Assignments
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {myWorkRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            All Work Orders
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {allRequests.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Unassigned Queue */}
      {activeTab === 'unassigned' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Unassigned Approved Requests
            </h2>
            <p className="text-xs text-slate-500">
              Requests approved by managers waiting to be assigned to operations personnel.
            </p>
          </div>

          {unassignedRequests.length === 0 ? (
            <EmptyState
              title="No unassigned requests"
              description="All approved service requests have been assigned to technicians."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {unassignedRequests.map((req) => (
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
                        Target SLA: {req.sla_due_at ? new Date(req.sla_due_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-800">{req.title}</h3>

                    <p className="text-xs text-slate-500">
                      Requested by <span className="font-medium text-slate-700">{req.requester?.name}</span> •{' '}
                      Category: {req.category}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          request: req,
                          action: 'assign',
                          comment: '',
                          assigneeId: operationsStaff[0]?.id || null,
                          isSubmitting: false,
                        })
                      }
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Assign Specialist
                    </Button>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAssignToSelf(req)}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Assign to Me
                    </Button>

                    <Link
                      to={`/requests/${req.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Assignments */}
      {activeTab === 'my-work' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">My Assigned Work Orders</h2>
            <p className="text-xs text-slate-500">
              Tickets assigned to your queue for execution and fulfillment.
            </p>
          </div>

          {myWorkRequests.length === 0 ? (
            <EmptyState
              title="No active assignments"
              description="You have no pending requests assigned to you right now. Pick up tickets from the unassigned queue."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {myWorkRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        {req.request_number}
                      </span>
                      <StatusBadge status={req.status} />
                      <PriorityBadge priority={req.priority} />
                    </div>

                    <h3 className="text-sm font-semibold text-slate-800">{req.title}</h3>

                    <p className="text-xs text-slate-500">
                      Requested by <span className="font-medium text-slate-700">{req.requester?.name}</span> •{' '}
                      Due {req.sla_due_at ? new Date(req.sla_due_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'approved' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            request: req,
                            action: 'in_progress',
                            comment: '',
                            assigneeId: null,
                            isSubmitting: false,
                          })
                        }
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                        Start Work
                      </Button>
                    )}

                    {req.status === 'in_progress' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            request: req,
                            action: 'completed',
                            comment: '',
                            assigneeId: null,
                            isSubmitting: false,
                          })
                        }
                      >
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        Complete Request
                      </Button>
                    )}

                    <Link
                      to={`/requests/${req.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: All Work Orders */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">All Operations Requests</h2>
              <p className="text-xs text-slate-500">Complete overview of operations fulfillment queue</p>
            </div>
            <Link
              to="/requests"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition"
            >
              Filter & Search <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {allRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {req.request_number}
                    </span>
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />
                  </div>
                  <h4 className="text-sm font-medium text-slate-800">{req.title}</h4>
                  <p className="text-xs text-slate-400">
                    Specialist: {req.assigned_to ? req.assigned_to.name : 'Unassigned'} •{' '}
                    Requester: {req.requester?.name}
                  </p>
                </div>

                <Link
                  to={`/requests/${req.id}`}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {actionModal.isOpen && actionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">
              {actionModal.action === 'assign' && 'Assign Operations Specialist'}
              {actionModal.action === 'in_progress' && 'Start Work on Request'}
              {actionModal.action === 'completed' && 'Complete Service Request'}
            </h3>

            <p className="text-xs text-slate-500">
              {actionModal.action === 'assign' &&
                'Select a specialist to take ownership of this approved request.'}
              {actionModal.action === 'in_progress' &&
                'Transition request to In Progress and notify the employee.'}
              {actionModal.action === 'completed' &&
                'Confirm resolution of all deliverables. This is a terminal state.'}
            </p>

            {actionModal.action === 'assign' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Assign To</label>
                <select
                  value={actionModal.assigneeId || ''}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      assigneeId: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {operationsStaff.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {actionModal.action === 'in_progress' ? 'Kick-off Note (Optional)' : 'Resolution Summary (Optional)'}
                </label>
                <textarea
                  value={actionModal.comment}
                  onChange={(e) =>
                    setActionModal((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  rows={3}
                  placeholder={
                    actionModal.action === 'in_progress'
                      ? 'e.g. Started provisioning developer licenses.'
                      : 'e.g. Workstation delivered and tested successfully.'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={actionModal.isSubmitting}
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    request: null,
                    action: null,
                    comment: '',
                    assigneeId: null,
                    isSubmitting: false,
                  })
                }
              >
                Cancel
              </Button>

              <Button
                size="sm"
                isLoading={actionModal.isSubmitting}
                className={
                  actionModal.action === 'completed'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }
                onClick={handleActionSubmit}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

