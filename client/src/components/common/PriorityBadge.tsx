import React from 'react';
import type { RequestPriority } from '@/types';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: RequestPriority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const configs: Record<RequestPriority, { text: string; color: string; bg: string }> = {
    low: { text: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
    medium: { text: 'Medium', color: 'text-blue-700', bg: 'bg-blue-100' },
    high: { text: 'High', color: 'text-amber-700', bg: 'bg-amber-100' },
    urgent: { text: 'Urgent', color: 'text-rose-700', bg: 'bg-rose-100' },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider',
        config.bg,
        config.color,
        className
      )}
    >
      {config.text}
    </span>
  );
};
