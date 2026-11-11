import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@/types';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Users, Mail, Shield, CheckCircle } from 'lucide-react';

export const OperationsTeamPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery<{ success: boolean; data: User[] }>({
    queryKey: ['users', 'operations'],
    queryFn: async () => {
      const res = await api.get('/users/operations');
      return res.data;
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading Operations roster..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load team"
        message="Only Operations specialists and Managers have access to the Operations team directory."
        onRetry={() => refetch()}
      />
    );
  }

  const team = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Operations Specialists
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Directory of operations personnel available for service request assignment and fulfillment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => (
          <div
            key={member.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
              {member.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{member.name}</h3>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {member.email}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Ready for tickets
                </span>
                <span className="text-[11px] font-mono text-slate-400">ID #{member.id}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
