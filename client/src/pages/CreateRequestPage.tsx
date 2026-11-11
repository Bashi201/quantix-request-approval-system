import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { ArrowLeft, Send, Save, AlertCircle } from 'lucide-react';

const createRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255, 'Title is too long'),
  category: z.string().min(2, 'Please select or enter a category'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().min(10, 'Please provide more details (at least 10 characters)'),
});

type FormData = z.infer<typeof createRequestSchema>;

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<'draft' | 'submitted'>('submitted');

  const {
    register,
    handleSubmit,
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

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      // 1. Create the request as draft or submit directly
      const createRes = await api.post('/requests', {
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
      });

      const newId = createRes.data.data.id;

      // 2. If user selected 'Submit for Approval', submit it
      if (submitIntent === 'submitted') {
        await api.post(`/requests/${newId}/submit`);
        toast.success('Service request created and submitted for approval.');
      } else {
        toast.success('Service request saved as draft.');
      }

      navigate(`/requests/${newId}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create request.';
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
          to="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Requests
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Create New Service Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Submit a request for IT hardware, software licenses, or facilities operations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField label="Request Title" required error={errors.title?.message}>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Request Docker Desktop Developer License"
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
            hint="Please explain business need and any relevant specifications"
            error={errors.description?.message}
          >
            <textarea
              rows={5}
              {...register('description')}
              placeholder="Specify the software, version, business justification, or hardware required..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </FormField>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-900">Manager Approval Required:</span>
              <p className="mt-0.5 text-amber-700">
                Submitting this request will automatically alert your assigned manager for review before
                being routed to the Operations fulfillment queue.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setSubmitIntent('draft')}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting && submitIntent === 'submitted'}
              onClick={() => setSubmitIntent('submitted')}
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
