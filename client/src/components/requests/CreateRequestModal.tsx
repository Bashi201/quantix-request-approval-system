import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useCreateModal } from '@/context/CreateModalContext';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { X, Send, Save, AlertCircle, PlusCircle } from 'lucide-react';

const createRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255, 'Title is too long'),
  category: z.string().min(2, 'Please select or enter a category'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().min(10, 'Please provide more details (at least 10 characters)'),
});

type FormData = z.infer<typeof createRequestSchema>;

export const CreateRequestModal: React.FC = () => {
  const { isOpen, closeCreateModal } = useCreateModal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<'draft' | 'submitted'>('submitted');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      title: '',
      category: 'Software & Access',
      priority: 'medium',
      description: '',
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    closeCreateModal();
  };

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      const isDirectSubmit = submitIntent === 'submitted';

      // 1. Create request (passing submit flag to backend)
      const res = await api.post('/requests', {
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        submit: isDirectSubmit,
      });

      const newRequest = res.data.data;

      toast.success(
        isDirectSubmit
          ? `Request ${newRequest.request_number} submitted for manager review.`
          : `Request ${newRequest.request_number} saved as draft.`
      );

      // 2. Refresh queries
      queryClient.invalidateQueries({ queryKey: ['requests'] });

      // 3. Reset and close modal
      handleClose();

      // 4. Navigate to details of the newly created request
      navigate(`/requests/${newRequest.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create request.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Create New Service Request
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit an IT, hardware, software, or facility request for approval
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <FormField label="Request Title" required error={errors.title?.message}>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Request Dual 4K Monitors for Development Station"
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
            hint="Describe specifications and business need"
            error={errors.description?.message}
          >
            <textarea
              rows={4}
              {...register('description')}
              placeholder="Explain the item required, technical specifications, and project justification..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </FormField>

          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Manager Approval Workflow:</span>
              <p className="mt-0.5 text-amber-700">
                Submitting this request alerts your direct manager for review. Once authorized, it is routed to Operations for fulfillment.
              </p>
            </div>
          </div>

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
              isLoading={isSubmitting && submitIntent === 'draft'}
              onClick={() => setSubmitIntent('draft')}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save as Draft
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting && submitIntent === 'submitted'}
              onClick={() => setSubmitIntent('submitted')}
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit for Approval
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
