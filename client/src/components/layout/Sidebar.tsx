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
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isEmployee, isManager, isOperations } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname;
  const currentSearch = location.search;

  // Mutually-exclusive tab active checks
  const isDashboardActive = currentPath === '/';

  // Employee checks
  const isEmployeeRequestsActive = currentPath === '/requests' || currentPath.startsWith('/requests/');

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

  const getLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-xs'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] shrink-0`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden bg-slate-50">
          <span className="font-bold text-slate-800 text-sm">Navigation</span>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Dashboard link for all roles */}
          <Link
            to="/"
            className={getLinkClass(isDashboardActive)}
            onClick={onClose}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${isDashboardActive ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Dashboard</span>
          </Link>

          {/* Employee Navigation */}
          {isEmployee && (
            <Link
              to="/requests"
              className={getLinkClass(isEmployeeRequestsActive)}
              onClick={onClose}
            >
              <FileText className={`w-4 h-4 shrink-0 ${isEmployeeRequestsActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>My Service Requests</span>
            </Link>
          )}

          {/* Manager Navigation */}
          {isManager && (
            <>
              <Link
                to="/requests?status=submitted"
                className={getLinkClass(isPendingApprovalsActive)}
                onClick={onClose}
              >
                <CheckSquare className={`w-4 h-4 shrink-0 ${isPendingApprovalsActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Pending Approvals</span>
              </Link>

              <Link
                to="/requests"
                className={getLinkClass(isTeamRequestsActive)}
                onClick={onClose}
              >
                <FileText className={`w-4 h-4 shrink-0 ${isTeamRequestsActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Team Requests</span>
              </Link>

              <Link
                to="/users/operations"
                className={getLinkClass(isManagerOpsStaffActive)}
                onClick={onClose}
              >
                <Users className={`w-4 h-4 shrink-0 ${isManagerOpsStaffActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Operations Staff</span>
              </Link>
            </>
          )}

          {/* Operations Navigation */}
          {isOperations && (
            <>
              <Link
                to="/requests?status=approved"
                className={getLinkClass(isOpsUnassignedActive)}
                onClick={onClose}
              >
                <Inbox className={`w-4 h-4 shrink-0 ${isOpsUnassignedActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Unassigned Queue</span>
              </Link>

              <Link
                to="/requests?status=in_progress"
                className={getLinkClass(isOpsInProgressActive)}
                onClick={onClose}
              >
                <Clock className={`w-4 h-4 shrink-0 ${isOpsInProgressActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>In Progress Work</span>
              </Link>

              <Link
                to="/requests"
                className={getLinkClass(isOpsAllOrdersActive)}
                onClick={onClose}
              >
                <FileText className={`w-4 h-4 shrink-0 ${isOpsAllOrdersActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>All Fulfillment Orders</span>
              </Link>

              <Link
                to="/users/operations"
                className={getLinkClass(isOpsTeamActive)}
                onClick={onClose}
              >
                <Users className={`w-4 h-4 shrink-0 ${isOpsTeamActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Operations Team</span>
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  );
};
