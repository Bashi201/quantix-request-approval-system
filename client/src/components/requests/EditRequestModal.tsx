import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useCreateModal } from '@/context/CreateModalContext';
import type { ServiceRequest } from '@/types';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { X, Send, Save, AlertCircle, Edit } from 'lucide-react';

const editRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255, 'Title is too long'),
  category: z.string().min(2, 'Please select or enter a category'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().min(10, 'Please provide more details (at least 10 characters)'),
});

type FormData = z.infer<typeof editRequestSchema>;

export const EditRequestModal: React.FC = () => {
  const { editRequestId, closeEditModal } = useCreateModal();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<'save' | 'resubmit'>('save');

  const {
    data: request,
    isLoading,
    error,
  } = useQuery<ServiceRequest>({
    queryKey: ['request', editRequestId],
    queryFn: async () => {
      const res = await api.get(`/requests/${editRequestId}`);
      return res.data.data;
    },
    enabled: !!editRequestId,
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

  if (!editRequestId) return null;

  const handleClose = () => {
    reset();
    closeEditModal();
  };

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      // 1. Update the request
      await api.put(`/requests/${editRequestId}`, values);

      // 2. If user chose 'Save & Resubmit', submit it
      if (submitIntent === 'resubmit') {
        await api.post(`/requests/${editRequestId}/submit`);
        toast.success(`Request ${request?.request_number || ''} updated and submitted for approval.`);
      } else {
        toast.success(`Request ${request?.request_number || ''} changes saved successfully.`);
      }

      // 3. Refresh cache
      queryClient.invalidateQueries({ queryKey: ['request', editRequestId] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });

      // 4. Close modal
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update request.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Edit Request {request?.request_number ? `(${request.request_number})` : ''}
                </h2>
                {request && <StatusBadge status={request.status} />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {request?.status === 'returned'
                  ? 'Update details based on manager feedback before resubmitting'
                  : 'Modify draft details before submitting for review'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading request details..." />
          </div>
        ) : error || !request ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Could not load request. Please close and try again.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
            <FormField label="Request Title" required error={errors.title?.message}>
              <input
                type="text"
                {...register('title')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Category" required error={errors.category?.message}>
                <select
                  {...register('category')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
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
                rows={4}
                {...register('description')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </FormField>

            {request.status === 'returned' && (
              <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex gap-3 text-xs text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Returned Request Notice:</span>
                  <p className="mt-0.5 text-amber-700">
                    Resubmitting this form will transition the request back to{' '}
                    <strong>Pending Approval</strong> and notify your manager for review.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setSubmitIntent('save')}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Changes
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting && submitIntent === 'resubmit'}
                onClick={() => setSubmitIntent('resubmit')}
                className="w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {request.status === 'returned' ? 'Save & Resubmit' : 'Save & Submit'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
