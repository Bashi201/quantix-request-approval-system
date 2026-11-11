import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CheckSquare,
  Users,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, isEmployee, isManager, isOperations } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-4rem)]`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
          <span className="font-bold text-slate-800 text-sm">Navigation Menu</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Persona Badge */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Workspace
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-bold text-slate-800 truncate">{user?.name}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
              {role}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLink to="/" className={navItemClass} onClick={onClose} end>
            <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-400" />
            Dashboard
          </NavLink>

          <NavLink to="/requests" className={navItemClass} onClick={onClose}>
            <FileText className="w-4 h-4 shrink-0 text-slate-400" />
            {isEmployee ? 'My Service Requests' : 'All Service Requests'}
          </NavLink>

          {isEmployee && (
            <NavLink to="/requests/new" className={navItemClass} onClick={onClose}>
              <PlusCircle className="w-4 h-4 shrink-0 text-indigo-600" />
              New Service Request
            </NavLink>
          )}

          {isManager && (
            <NavLink to="/requests?status=submitted" className={navItemClass} onClick={onClose}>
              <CheckSquare className="w-4 h-4 shrink-0 text-blue-600" />
              Pending Team Reviews
            </NavLink>
          )}

          {isOperations && (
            <NavLink to="/users/operations" className={navItemClass} onClick={onClose}>
              <Users className="w-4 h-4 shrink-0 text-emerald-600" />
              Operations Team
            </NavLink>
          )}
        </nav>

        {/* Quick Reviewer Demo Helper Box */}
        <div className="p-3 m-3 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-900 text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Reviewer Sandbox
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            All seeded users use password <code className="bg-white px-1 py-0.5 rounded border">password</code>.
          </p>
        </div>
      </aside>
    </>
  );
};
