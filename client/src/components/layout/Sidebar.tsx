import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  X,
  Inbox,
  Clock,
  ChevronRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isEmployee, isManager, isOperations, role } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname;
  const currentSearch = location.search;

  // Mutually-exclusive tab active checks
  const isDashboardActive = currentPath === '/';

  // Employee checks
  const isEmployeeRequestsActive =
    currentPath === '/requests' || currentPath.startsWith('/requests/');

  // Manager checks
  const isPendingApprovalsActive =
    currentPath === '/requests' && currentSearch.includes('status=submitted');
  const isTeamRequestsActive =
    (currentPath === '/requests' && !currentSearch.includes('status=submitted')) ||
    (currentPath.startsWith('/requests/') && !isPendingApprovalsActive);
  const isManagerOpsStaffActive = currentPath.startsWith('/users/operations');

  // Operations checks
  const isOpsUnassignedActive =
    currentPath === '/requests' && currentSearch.includes('status=approved');
  const isOpsInProgressActive =
    currentPath === '/requests' && currentSearch.includes('status=in_progress');
  const isOpsAllOrdersActive =
    (currentPath === '/requests' &&
      !currentSearch.includes('status=approved') &&
      !currentSearch.includes('status=in_progress')) ||
    (currentPath.startsWith('/requests/') &&
      !isOpsUnassignedActive &&
      !isOpsInProgressActive);
  const isOpsTeamActive = currentPath.startsWith('/users/operations');

  const getLinkClasses = (isActive: boolean) =>
    `group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-white text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-xs ring-1 ring-slate-900/5'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-2xs'
    }`;

  const getIconWrapper = (isActive: boolean, accentColor = 'indigo') =>
    `w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
      isActive
        ? `bg-${accentColor}-50 text-${accentColor}-600`
        : 'bg-transparent text-slate-400 group-hover:text-slate-600'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar: sticky on desktop, drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-50/70 backdrop-blur-md border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] shrink-0 select-none`}
      >
        {/* Top Section */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden bg-white">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span className="font-extrabold text-slate-800 text-sm">Navigation</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Label */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Workspace Directory
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50/80 text-indigo-700 border border-indigo-100">
              {role || 'Role'}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {/* Dashboard link for all roles */}
            <Link
              to="/"
              className={getLinkClasses(isDashboardActive)}
              onClick={onClose}
            >
              <div className="flex items-center gap-2.5">
                <div className={getIconWrapper(isDashboardActive)}>
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span>Dashboard</span>
              </div>
              {isDashboardActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
            </Link>

            {/* Employee Navigation */}
            {isEmployee && (
              <Link
                to="/requests"
                className={getLinkClasses(isEmployeeRequestsActive)}
                onClick={onClose}
              >
                <div className="flex items-center gap-2.5">
                  <div className={getIconWrapper(isEmployeeRequestsActive)}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>My Service Requests</span>
                </div>
                {isEmployeeRequestsActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                )}
              </Link>
            )}

            {/* Manager Navigation */}
            {isManager && (
              <>
                <Link
                  to="/requests?status=submitted"
                  className={getLinkClasses(isPendingApprovalsActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isPendingApprovalsActive, 'amber')}>
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    </div>
                    <span>Pending Approvals</span>
                  </div>
                  {isPendingApprovalsActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>

                <Link
                  to="/requests"
                  className={getLinkClasses(isTeamRequestsActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isTeamRequestsActive)}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>Team Requests</span>
                  </div>
                  {isTeamRequestsActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>

                <Link
                  to="/users/operations"
                  className={getLinkClasses(isManagerOpsStaffActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isManagerOpsStaffActive)}>
                      <Users className="w-4 h-4" />
                    </div>
                    <span>Operations Staff</span>
                  </div>
                  {isManagerOpsStaffActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>
              </>
            )}

            {/* Operations Navigation */}
            {isOperations && (
              <>
                <Link
                  to="/requests?status=approved"
                  className={getLinkClasses(isOpsUnassignedActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isOpsUnassignedActive, 'amber')}>
                      <Inbox className="w-4 h-4 text-amber-600" />
                    </div>
                    <span>Unassigned Queue</span>
                  </div>
                  {isOpsUnassignedActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>

                <Link
                  to="/requests?status=in_progress"
                  className={getLinkClasses(isOpsInProgressActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isOpsInProgressActive, 'blue')}>
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>In Progress Work</span>
                  </div>
                  {isOpsInProgressActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>

                <Link
                  to="/requests"
                  className={getLinkClasses(isOpsAllOrdersActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isOpsAllOrdersActive)}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>All Fulfillment Orders</span>
                  </div>
                  {isOpsAllOrdersActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>

                <Link
                  to="/users/operations"
                  className={getLinkClasses(isOpsTeamActive)}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={getIconWrapper(isOpsTeamActive, 'emerald')}>
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span>Operations Team</span>
                  </div>
                  {isOpsTeamActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Bottom Status Card */}
        <div className="p-3 m-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-800">Cluster Online</span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-slate-400">v2.4</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
              ISO 27001 RBAC
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-600" />
              99.98%
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
