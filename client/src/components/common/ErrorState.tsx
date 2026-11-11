import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while communicating with the service.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-xl border border-rose-200 ${className}`}>
      <div className="p-3 bg-rose-100 text-rose-600 rounded-full mb-3">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-rose-900">{title}</h3>
      <p className="text-xs sm:text-sm text-rose-700 max-w-sm mt-1">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 border-rose-300 text-rose-800 hover:bg-rose-100">
          Try Again
        </Button>
      )}
    </div>
  );
};
