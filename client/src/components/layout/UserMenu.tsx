import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const roleColors = {
    employee: 'bg-blue-100 text-blue-700 border-blue-200',
    manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    operations: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition text-left"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
          {initials}
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
          <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  roleColors[user.role]
                }`}
              >
                <Shield className="w-3 h-3" />
                {user.role}
              </span>
            </div>
            {user.manager && (
              <p className="text-[11px] text-slate-500 mt-2">
                Manager: <span className="font-medium text-slate-700">{user.manager.name}</span>
              </p>
            )}
          </div>

          <div className="py-1">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
