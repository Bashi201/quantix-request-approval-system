import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  hint,
  className,
  children,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-semibold text-slate-700 tracking-wide flex items-center justify-between">
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
      {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
    </div>
  );
};
