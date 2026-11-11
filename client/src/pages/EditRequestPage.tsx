import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { ServiceRequest } from '@/types';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ArrowLeft, Send, Save, AlertCircle } from 'lucide-react';

const editRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255, 'Title is too long'),
  category: z.string().min(2, 'Please select or enter a category'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().min(10, 'Please provide more details (at least 10 characters)'),
});

type FormData = z.infer<typeof editRequestSchema>;

export const EditRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<'save' | 'resubmit'>('save');

  const {
    data: request,
    isLoading,
    error,
  } = useQuery<ServiceRequest>({
    queryKey: ['request', id],
    queryFn: async () => {
      const res = await api.get(`/requests/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(editRequestSchema),
  });

  useEffect(() => {
    if (request) {
      reset({
        title: request.title,
        category: request.category,
        priority: request.priority,
        description: request.description,
      });
    }
  }, [request, reset]);

  if (isLoading) return <LoadingState message="Loading request details..." />;
  if (error || !request) {
    return (
      <ErrorState
        title="Could not load request"
        message="Request not found or you lack permission to view it."
      />
    );
  }

  // Authorization check: only requester can edit, and only in draft or returned status
  const isOwner = user?.id === request.requester?.id;
  const canEdit = isOwner && (request.status === 'draft' || request.status === 'returned');

  if (!canEdit) {
    return (
      <ErrorState
        title="Editing Restricted"
        message="You cannot edit this request because it is already under review or has been completed."
        onRetry={() => navigate(`/requests/${id}`)}
      />
    );
  }

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      // 1. Update the request details
      await api.put(`/requests/${id}`, values);

      // 2. If user chose 'Save & Submit for Approval', submit it
      if (submitIntent === 'resubmit') {
        await api.post(`/requests/${id}/submit`);
        toast.success('Request updated and submitted for approval.');
      } else {
        toast.success('Request changes saved successfully.');
      }

      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate(`/requests/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update request.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to={`/requests/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Request Details
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Edit Request {request.request_number}
          </h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {request.status === 'returned'
            ? 'Update the request according to your manager’s feedback before resubmitting.'
            : 'Modify the draft details before submitting for approval.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField label="Request Title" required error={errors.title?.message}>
            <input
              type="text"
              {...register('title')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category" required error={errors.category?.message}>
              <select
                {...register('category')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="Software & Access">Software & Access</option>
                <option value="Hardware & Peripherals">Hardware & Peripherals</option>
                <option value="Workstation Setup">Workstation Setup</option>
                <option value="Facility & Access Badges">Facility & Access Badges</option>
                <option value="General Support">General Support</option>
              </select>
            </FormField>

            <FormField label="Priority Level" required error={errors.priority?.message}>
              <select
                {...register('priority')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="low">Low (Standard SLA 72h)</option>
                <option value="medium">Medium (Standard SLA 48h)</option>
                <option value="high">High (Priority SLA 24h)</option>
                <option value="urgent">Urgent (Critical SLA 8h)</option>
              </select>
            </FormField>
          </div>

          <FormField
            label="Detailed Description & Justification"
            required
            error={errors.description?.message}
          >
            <textarea
              rows={5}
              {...register('description')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </FormField>

          {request.status === 'returned' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold text-amber-900">Returned Request Notice:</span>
                <p className="mt-0.5 text-amber-700">
                  Resubmitting this form will transition the request back to <strong>Pending Approval</strong> and notify your manager.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setSubmitIntent('save')}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting && submitIntent === 'resubmit'}
              onClick={() => setSubmitIntent('resubmit')}
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              {request.status === 'returned' ? 'Save & Resubmit' : 'Save & Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
