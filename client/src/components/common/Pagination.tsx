import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
  className = '',
}) => {
  if (total <= perPage && currentPage === 1) {
    return null;
  }

  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white border-t border-slate-200 text-sm ${className}`}>
      <div className="text-slate-600 text-xs sm:text-sm">
        Showing <span className="font-semibold text-slate-900">{start}</span> to{' '}
        <span className="font-semibold text-slate-900">{end}</span> of{' '}
        <span className="font-semibold text-slate-900">{total}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-md">
          {currentPage} / {lastPage || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
