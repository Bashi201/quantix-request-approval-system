import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { ServiceRequest, RequestComment, RequestActivity } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Shield,
  Send,
  MessageSquare,
  History,
  CheckCircle,
  XCircle,
  RotateCcw,
  PlayCircle,
  CheckCheck,
  UserCheck,
  Edit,
} from 'lucide-react';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isEmployee, isManager, isOperations } = useAuth();
  const toast = useToast();

  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Modals state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'approve' | 'reject' | 'return' | 'in_progress' | 'completed' | 'submit' | null;
    requireComment?: boolean;
    commentLabel?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: null,
  });
  const [modalComment, setModalComment] = useState('');

  const { data: request, isLoading, error, refetch } = useQuery<ServiceRequest>({
    queryKey: ['request', id],
    queryFn: async () => {
      const res = await api.get(`/requests/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // Post comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    try {
      await api.post(`/requests/${id}/comments`, {
        comment: commentText,
      });
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      toast.success('Comment posted successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Workflow Action Handler
  const handleWorkflowAction = async () => {
    const { actionType } = modalState;
    if (!actionType) return;

    try {
      if (actionType === 'submit') {
        await api.post(`/requests/${id}/submit`);
        toast.success('Request submitted for approval.');
      } else if (actionType === 'approve' || actionType === 'reject' || actionType === 'return') {
        await api.post(`/requests/${id}/decision`, {
          action: actionType,
          comment: modalComment || undefined,
        });
        toast.success(
          actionType === 'approve'
            ? 'Request approved.'
            : actionType === 'reject'
            ? 'Request rejected.'
            : 'Request returned for revision.'
        );
      } else if (actionType === 'in_progress' || actionType === 'completed') {
        await api.post(`/requests/${id}/status`, {
          status: actionType,
          comment: modalComment || undefined,
        });
        toast.success(
          actionType === 'in_progress'
            ? 'Work started on request.'
            : 'Request marked as completed.'
        );
      }

      setModalState({ isOpen: false, title: '', description: '', actionType: null });
      setModalComment('');
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  // Operations assign to self
  const handleAssignToSelf = async () => {
    if (!user) return;
    try {
      await api.post(`/requests/${id}/assign`, {
        assigned_to_id: user.id,
      });
      toast.success('Request successfully assigned to you.');
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign request.');
    }
  };

  if (isLoading) return <LoadingState message="Loading request details..." />;
  if (error || !request) {
    return (
      <ErrorState
        title="Could not load request"
        message="The requested service request could not be found or you do not have permission to view it."
        onRetry={() => refetch()}
      />
    );
  }

  const isOwner = user?.id === request.requester?.id;
  const canSubmit = isOwner && (request.status === 'draft' || request.status === 'returned');
  const canManagerDecide = isManager && request.status === 'submitted';
  const canOperationsAssign = isOperations && request.status === 'approved' && !request.assigned_to;
  const canOperationsStart = isOperations && request.status === 'approved';
  const canOperationsComplete = isOperations && request.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Requests
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-bold text-indigo-600">
              {request.request_number}
            </span>
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            {request.title}
          </h1>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {canSubmit && (
            <>
              <Link
                to={`/requests/${request.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium shadow-sm transition"
              >
                <Edit className="w-4 h-4" />
                Edit Request
              </Link>

              <Button
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    title: 'Submit Request for Approval',
                    description:
                      'Your assigned manager will be notified immediately to review this request.',
                    actionType: 'submit',
                  })
                }
              >
                <Send className="w-4 h-4 mr-1.5" />
                Submit for Approval
              </Button>
            </>
          )}

          {canManagerDecide && (
            <>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    title: 'Return Request for Revision',
                    description: 'Please describe what changes the employee must make.',
                    actionType: 'return',
                    requireComment: true,
                    commentLabel: 'Reason for return',
                  })
                }
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Return
              </Button>

              <Button
                variant="destructive"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    title: 'Reject Service Request',
                    description: 'State the justification for rejecting this request.',
                    actionType: 'reject',
                    requireComment: true,
                    commentLabel: 'Rejection reason',
                  })
                }
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    title: 'Approve Service Request',
                    description:
                      'Approving this request will route it immediately to the Operations fulfillment queue.',
                    actionType: 'approve',
                    commentLabel: 'Optional approval note',
                  })
                }
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Approve Request
              </Button>
            </>
          )}

          {canOperationsAssign && (
            <Button variant="outline" onClick={handleAssignToSelf}>
              <UserCheck className="w-4 h-4 mr-1.5" />
              Assign to Me
            </Button>
          )}

          {canOperationsStart && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() =>
                setModalState({
                  isOpen: true,
                  title: 'Start Work on Request',
                  description:
                    'This transitions the request to In Progress and informs the requester.',
                  actionType: 'in_progress',
                  commentLabel: 'Optional kick-off note',
                })
              }
            >
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Start Work
            </Button>
          )}

          {canOperationsComplete && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() =>
                setModalState({
                  isOpen: true,
                  title: 'Complete Service Request',
                  description:
                    'Confirm that all fulfillment tasks and deliverables have been resolved.',
                  actionType: 'completed',
                  commentLabel: 'Completion summary / resolution note',
                })
              }
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark as Completed
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Request Information
            </h2>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {request.description}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Category</span>
                <span className="font-semibold text-slate-800">{request.category || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Target SLA</span>
                <span className="font-semibold text-slate-800">
                  {request.sla_due_at
                    ? new Date(request.sla_due_at).toLocaleString()
                    : 'Calculated upon submission'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Created</span>
                <span className="font-semibold text-slate-800">
                  {new Date(request.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Discussion & Comments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Discussion ({request.comments?.length || 0})
              </h2>
            </div>

            {/* Existing Comments */}
            <div className="space-y-4">
              {request.comments && request.comments.length > 0 ? (
                request.comments.map((comment: RequestComment) => (
                  <div key={comment.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{comment.user?.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-200/70 text-slate-700">
                          {comment.user?.role}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No comments yet. Start the conversation below.
                </p>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="pt-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder="Write a comment or ask for updates..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || isPostingComment}
                  isLoading={isPostingComment}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Post Comment
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Metadata & Audit Trail */}
        <div className="space-y-6">
          {/* People & Assignments Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Stakeholders
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Requester</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    {request.requester?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{request.requester?.name}</p>
                    <p className="text-slate-400 text-[11px]">{request.requester?.email}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">Assigned Operations Specialist</span>
                {request.assigned_to ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                      {request.assigned_to.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{request.assigned_to.name}</p>
                      <p className="text-slate-400 text-[11px]">{request.assigned_to.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Unassigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <History className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Activity History</h2>
            </div>

            <div className="space-y-4">
              {request.activities && request.activities.length > 0 ? (
                request.activities.map((act: RequestActivity) => (
                  <div key={act.id} className="relative pl-5 border-l-2 border-indigo-100 space-y-1">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 capitalize">
                        {act.action.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400">
                        {new Date(act.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      By <span className="font-medium">{act.user?.name}</span>
                    </p>
                    {act.comment && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-md border border-slate-100 mt-1">
                        "{act.comment}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Dialog */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">{modalState.title}</h3>
            <p className="text-xs text-slate-500">{modalState.description}</p>

            {modalState.commentLabel && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {modalState.commentLabel}
                  {modalState.requireComment && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <textarea
                  value={modalComment}
                  onChange={(e) => setModalComment(e.target.value)}
                  rows={3}
                  placeholder="Enter details..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setModalState({ isOpen: false, title: '', description: '', actionType: null })
                }
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={modalState.requireComment && !modalComment.trim()}
                onClick={handleWorkflowAction}
              >
                Confirm Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
