import React from 'react';
import type { RequestStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RequestStatus;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const configs: Record<
    RequestStatus,
    { text: string; bg: string; border: string; dot: string; textColor: string }
  > = {
    draft: {
      text: 'Draft',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      textColor: 'text-slate-700',
    },
    submitted: {
      text: 'Pending Approval',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      dot: 'bg-blue-500 animate-pulse',
      textColor: 'text-blue-700',
    },
    returned: {
      text: 'Returned',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      textColor: 'text-amber-700',
    },
    approved: {
      text: 'Approved',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
      textColor: 'text-indigo-700',
    },
    in_progress: {
      text: 'In Progress',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
      textColor: 'text-purple-700',
    },
    completed: {
      text: 'Completed',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      textColor: 'text-emerald-700',
    },
    rejected: {
      text: 'Rejected',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
      textColor: 'text-rose-700',
    },
  };

  const config = configs[status] || configs.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs',
        config.bg,
        config.border,
        config.textColor,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      {label || config.text}
    </span>
  );
};
