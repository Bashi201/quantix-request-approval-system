import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PaginatedResponse, ServiceRequest, RequestStatus, RequestPriority } from '@/types';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterDropdown } from '@/components/common/FilterDropdown';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { PlusCircle, Eye } from 'lucide-react';

export const RequestsListPage: React.FC = () => {
  const { isEmployee } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const status = (searchParams.get('status') || '') as RequestStatus | '';
  const priority = (searchParams.get('priority') || '') as RequestPriority | '';

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<ServiceRequest>>({
    queryKey: ['requests', page, search, status, priority],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);

      const res = await api.get(`/requests?${params.toString()}`);
      return res.data;
    },
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // reset page on filter change
    setSearchParams(next);
  };

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Returned', value: 'returned' },
    { label: 'Approved', value: 'approved' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const priorityOptions = [
    { label: 'All Priorities', value: '' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  const columns: Column<ServiceRequest>[] = [
    {
      key: 'request_number',
      header: 'Request #',
      render: (req: ServiceRequest) => (
        <span className="font-mono text-xs font-bold text-indigo-600">
          {req.request_number}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title & Requester',
      render: (req: ServiceRequest) => (
        <div className="max-w-xs sm:max-w-md">
          <Link
            to={`/requests/${req.id}`}
            className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-indigo-600 line-clamp-1 transition"
          >
            {req.title}
          </Link>
          <div className="text-[11px] text-slate-400 mt-0.5">
            By <span className="text-slate-600 font-medium">{req.requester?.name}</span> •{' '}
            {req.requester?.email}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (req: ServiceRequest) => <PriorityBadge priority={req.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (req: ServiceRequest) => <StatusBadge status={req.status} />,
    },
    {
      key: 'assigned_to',
      header: 'Assigned Specialist',
      render: (req: ServiceRequest) => (
        <span className="text-xs text-slate-600">
          {req.assigned_to ? req.assigned_to.name : <span className="text-slate-400 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (req: ServiceRequest) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(req.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (req: ServiceRequest) => (
        <Link
          to={`/requests/${req.id}`}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg inline-flex items-center transition"
          title="View Request Details"
        >
          <Eye className="w-4 h-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & New Request button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Service Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage, track, and filter requests in your designated scope.
          </p>
        </div>

        {isEmployee && (
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Create Request
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="w-full md:w-80">
          <SearchInput
            placeholder="Search by title or #..."
            value={search}
            onChange={(val) => updateParam('search', val)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <FilterDropdown
            label="Status"
            value={status}
            options={statusOptions}
            onChange={(val) => updateParam('status', val)}
          />

          <FilterDropdown
            label="Priority"
            value={priority}
            options={priorityOptions}
            onChange={(val) => updateParam('priority', val)}
          />
        </div>
      </div>

      {/* Table & States */}
      {isLoading ? (
        <LoadingState message="Loading service requests..." />
      ) : error ? (
        <ErrorState
          title="Failed to load requests"
          message="An error occurred while fetching the service requests."
          onRetry={() => refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No requests found"
          description={
            search || status || priority
              ? 'Try modifying your search or filter parameters.'
              : 'You have no service requests in your queue at this moment.'
          }
          actionLabel={isEmployee ? 'Create Your First Request' : undefined}
          onAction={isEmployee ? () => (window.location.href = '/requests/new') : undefined}
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={data.data}
            keyExtractor={(req) => req.id}
          />
          {data.meta && (
            <Pagination
              currentPage={data.meta.current_page}
              lastPage={data.meta.last_page}
              total={data.meta.total}
              perPage={data.meta.per_page}
              onPageChange={(p) => {
                const next = new URLSearchParams(searchParams);
                next.set('page', p.toString());
                setSearchParams(next);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
